import { NextResponse } from "next/server";

import { getBaseUrl } from "@/lib/base-url";
import { buildStaffInvitationEmail, sendTransactionalEmail } from "@/lib/email";
import { canonicalizeUserRole } from "@/lib/roles";
import { requireAuthorizedUser, supabaseAdmin } from "@/lib/supabase-admin";
import { COLLECTIONS } from "@/lib/types";

export const runtime = "nodejs";

async function findAuthUserById(userId: string) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    throw error;
  }

  return data.users.find((user) => user.id === userId) || null;
}

function getStaffRole(user: any) {
  const metadata = (user?.user_metadata || {}) as Record<string, unknown>;
  return canonicalizeUserRole(String(metadata.role || ""));
}

function isPendingInvite(user: any) {
  return !((user as any)?.last_sign_in_at || (user as any)?.email_confirmed_at || (user as any)?.confirmed_at);
}

function getInviteDestination(role: string) {
  return role === "greeter" ? "/greeter/signin" : "/administrator/signin";
}

function toAbsoluteBaseUrl(value: string) {
  const trimmed = String(value || "").trim().replace(/\/$/, "");
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function normalizeInviteActionLink(input: {
  actionLink: string;
  baseUrl: string;
  finalDestination: string;
}) {
  const callbackBase = `${input.baseUrl}/auth/callback?next=${encodeURIComponent(input.finalDestination)}`;

  try {
    const parsed = new URL(input.actionLink);
    const hash = parsed.hash.startsWith("#") ? parsed.hash.slice(1) : "";
    const hashParams = new URLSearchParams(hash);
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    if (accessToken && refreshToken) {
      return `${callbackBase}#${hash}`;
    }

    const tokenHash = parsed.searchParams.get("token_hash");
    const type = parsed.searchParams.get("type");
    if (tokenHash && type) {
      return `${callbackBase}&token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(type)}`;
    }

    return input.actionLink;
  } catch {
    return input.actionLink;
  }
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
  const baseUrl = toAbsoluteBaseUrl(getBaseUrl(request));
  const redirectTo = `${baseUrl}/auth/callback?next=${encodeURIComponent(finalDestination)}`;

  const generated = await supabaseAdmin.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      redirectTo,
      data: {
        ...(user.user_metadata || {}),
        role,
      },
    },
  });

  if (generated.error || !generated.data?.properties?.action_link) {
    return NextResponse.json({ error: generated.error?.message || "Failed to regenerate invitation link" }, { status: 500 });
  }

  const metadata = (user.user_metadata || {}) as Record<string, unknown>;
  const fullName = String(metadata.full_name || metadata.display_name || metadata.displayName || "").trim();
  const inviteLink = normalizeInviteActionLink({
    actionLink: generated.data.properties.action_link,
    baseUrl,
    finalDestination,
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
    await requireAuthorizedUser(request.headers.get("authorization"), ["admin"]);
    const { userId } = await context.params;

    return await resendStaffInvitation(request, userId);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to resend invitation";
    const status = message === "Forbidden" ? 403 : message.includes("authorization") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    await requireAuthorizedUser(request.headers.get("authorization"), ["admin"]);
    const { userId } = await context.params;

    return await revokeStaffInvitation(userId);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to revoke invitation";
    const status = message === "Forbidden" ? 403 : message.includes("authorization") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
