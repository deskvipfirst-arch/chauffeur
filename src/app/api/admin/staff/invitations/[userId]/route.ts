import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api/errors";
import { getRequestIp, rateLimitByKey } from "@/lib/api/rate-limit";
import { buildStaffInvitationEmail, sendTransactionalEmail } from "@/lib/email";
import { canonicalizeUserRole } from "@/lib/roles";
import { requireAuthorizedUser, supabaseAdmin } from "@/lib/supabase/admin";
import { COLLECTIONS } from "@/lib/types";
import { buildInviteCallbackUrl, extractTokensFromInviteUrl, getBaseUrl, rewriteInviteVerifyRedirect } from "@/lib/url";

export const runtime = "nodejs";

const INVITE_ACTION_MAX_REQUESTS_PER_MINUTE = 12;

type UserRecordLike = {
  user_metadata?: Record<string, unknown>;
  last_sign_in_at?: string | null;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
};

function logInviteAction(event: string, details: Record<string, unknown>) {
  console.info("[invite-flow]", event, details);
}

async function findAuthUserById(userId: string) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    throw error;
  }

  return data.users.find((user) => user.id === userId) || null;
}

function getStaffRole(user: UserRecordLike) {
  const metadata = (user?.user_metadata || {}) as Record<string, unknown>;
  return canonicalizeUserRole(String(metadata.role || ""));
}

function isPendingInvite(user: UserRecordLike) {
  return !(user.last_sign_in_at || user.email_confirmed_at || user.confirmed_at);
}

function getInviteDestination(role: string) {
  return role === "greeter" ? "/greeter/signin" : "/administrator/signin";
}

function logInviteLinkWarning(event: string, details: Record<string, unknown>) {
  console.warn("[staff-invite-link-resend]", event, JSON.stringify(details));
}

async function resendStaffInvitation(request: Request, userId: string) {
  const user = await findAuthUserById(userId);
  if (!user) {
    return NextResponse.json({ error: "Staff user not found" }, { status: 404 });
  }

  const role = getStaffRole(user);
  if (!["admin", "greeter", "heathrow"].includes(role)) {
    return NextResponse.json({ error: "Only staff users can be reinvited" }, { status: 400 });
  }

  if (!isPendingInvite(user)) {
    return NextResponse.json({ error: "This invitation has already been accepted" }, { status: 400 });
  }

  const email = String(user.email || "").trim().toLowerCase();
  const finalDestination = getInviteDestination(role);
  const baseUrl = getBaseUrl(request);
  const redirectTo = `${baseUrl}/auth/callback`;

  if (!/^https?:\/\//i.test(baseUrl)) {
    return NextResponse.json(
      { error: `Invalid base URL format: ${baseUrl}. Must include protocol.` },
      { status: 500 }
    );
  }

  logInviteAction("resend-start", {
    userId,
    email,
    role,
    destination: finalDestination,
    sourceIp: getRequestIp(request),
  });

  if (/\.supabase\.co/i.test(redirectTo)) {
    return NextResponse.json(
      { error: "Unsafe redirect URL detected. Check APP_BASE_URL/NEXT_PUBLIC_BASE_URL configuration." },
      { status: 500 }
    );
  }

  const generated = await supabaseAdmin.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      redirectTo,
      data: {
        ...(user.user_metadata || {}),
        role,
        needs_password_setup: true,
      },
    },
  });

  if (generated.error || !generated.data?.properties?.action_link) {
    return NextResponse.json({ error: generated.error?.message || "Failed to regenerate invitation link" }, { status: 500 });
  }

  const metadata = (user.user_metadata || {}) as Record<string, unknown>;
  const fullName = String(metadata.full_name || metadata.display_name || metadata.displayName || "").trim();
  const extractedTokens = extractTokensFromInviteUrl(generated.data.properties.action_link);
  const hasNormalizedTokens = Boolean(extractedTokens.code || extractedTokens.accessToken || extractedTokens.tokenHash);
  const inviteLink = hasNormalizedTokens
    ? buildInviteCallbackUrl(baseUrl, extractedTokens, finalDestination)
    : rewriteInviteVerifyRedirect(generated.data.properties.action_link, baseUrl, finalDestination);

  logInviteLinkWarning("invite-link-regenerated", {
    email,
    role,
    redirectTo,
    generatedLinkHost: (() => {
      try {
        return new URL(generated.data.properties.action_link).host;
      } catch {
        return "invalid-url";
      }
    })(),
    normalizedLinkHost: (() => {
      try {
        return new URL(inviteLink).host;
      } catch {
        return "invalid-url";
      }
    })(),
  });
  const invitationEmail = buildStaffInvitationEmail({
    email,
    role: role as "admin" | "greeter" | "heathrow",
    inviteLink,
    fullName: fullName || undefined,
  });
  await sendTransactionalEmail({
    to: email,
    subject: invitationEmail.subject,
    html: invitationEmail.html,
    text: invitationEmail.text,
  });

  logInviteAction("resend-success", {
    userId,
    email,
    role,
  });

  return NextResponse.json({ success: true, message: "Invitation resent successfully" });
}

async function revokeStaffInvitation(userId: string) {
  const user = await findAuthUserById(userId);
  if (!user) {
    return NextResponse.json({ error: "Staff user not found" }, { status: 404 });
  }

  const role = getStaffRole(user);
  if (!["admin", "greeter", "heathrow"].includes(role)) {
    return NextResponse.json({ error: "Only staff users can be revoked from this endpoint" }, { status: 400 });
  }

  if (!isPendingInvite(user)) {
    return NextResponse.json(
      { error: "Only pending invitations can be revoked from this screen" },
      { status: 400 }
    );
  }

  const { error: profileError } = await supabaseAdmin.from(COLLECTIONS.USERS).delete().eq("id", userId);
  if (profileError) {
    console.warn("Profile delete warning during invite revoke:", profileError.message);
  }

  const deleted = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (deleted.error) {
    return NextResponse.json({ error: deleted.error.message || "Failed to revoke invitation" }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "Invitation revoked successfully" });
}

export async function POST(request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    const sourceIp = getRequestIp(request);
    const limit = await rateLimitByKey(`staff-invite-resend:${sourceIp}`, INVITE_ACTION_MAX_REQUESTS_PER_MINUTE, 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many invite actions. Please wait and try again." },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSeconds) },
        }
      );
    }

    await requireAuthorizedUser(request.headers.get("authorization"), ["admin"]);
    const { userId } = await context.params;

    return await resendStaffInvitation(request, userId);
  } catch (error: unknown) {
    console.error("[invite-flow] resend-error", error);
    return apiErrorResponse(error, "Failed to resend invitation");
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    const sourceIp = getRequestIp(request);
    const limit = await rateLimitByKey(`staff-invite-revoke:${sourceIp}`, INVITE_ACTION_MAX_REQUESTS_PER_MINUTE, 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many invite actions. Please wait and try again." },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSeconds) },
        }
      );
    }

    await requireAuthorizedUser(request.headers.get("authorization"), ["admin"]);
    const { userId } = await context.params;

    logInviteAction("revoke-start", {
      userId,
      sourceIp,
    });

    const response = await revokeStaffInvitation(userId);

    logInviteAction("revoke-success", {
      userId,
      sourceIp,
    });

    return response;
  } catch (error: unknown) {
    console.error("[invite-flow] revoke-error", error);
    return apiErrorResponse(error, "Failed to revoke invitation");
  }
}
