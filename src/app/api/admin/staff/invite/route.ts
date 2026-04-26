import { NextResponse } from "next/server";

import { getBaseUrl } from "@/lib/base-url";
import { buildStaffInvitationEmail, sendTransactionalEmail } from "@/lib/email";
import { canonicalizeUserRole } from "@/lib/roles";
import { createUserProfile, requireAuthorizedUser, supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type InviteRole = "admin" | "greeter" | "heathrow";

function getStatusCode(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";

  if (message === "Missing authorization token" || message === "Invalid authorization token") {
    return 401;
  }

  if (message === "Forbidden") {
    return 403;
  }

  if (
    message === "A valid email address is required" ||
    message === "Please choose a supported staff role"
  ) {
    return 400;
  }

  return 500;
}

async function findAuthUserByEmail(email: string) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    throw error;
  }

  return data.users.find((user) => String(user.email || "").trim().toLowerCase() === email) || null;
}

function getInviteDestination(role: InviteRole) {
  return role === "greeter" ? "/greeter/signin" : "/administrator/signin";
}

function toAbsoluteBaseUrl(value: string) {
  const trimmed = String(value || "").trim().replace(/\/$/, "");
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function logInviteLinkWarning(event: string, details: Record<string, unknown>) {
  console.warn("[staff-invite-link]", event, JSON.stringify(details));
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
    const hashTokenHash = hashParams.get("token_hash");
    const hashType = hashParams.get("type");

    if (accessToken && refreshToken) {
      return `${callbackBase}#${hash}`;
    }

    if (hashTokenHash && hashType) {
      return `${callbackBase}&token_hash=${encodeURIComponent(hashTokenHash)}&type=${encodeURIComponent(hashType)}`;
    }

    const tokenHash = parsed.searchParams.get("token_hash");
    const type = parsed.searchParams.get("type");
    if (tokenHash && type) {
      return `${callbackBase}&token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(type)}`;
    }

    logInviteLinkWarning("unexpected-action-link-shape", {
      host: parsed.host,
      path: parsed.pathname,
      hasHash: Boolean(hash),
      queryKeys: Array.from(parsed.searchParams.keys()),
    });

    return input.actionLink;
  } catch {
    logInviteLinkWarning("invalid-action-link-url", {
      actionLinkSample: input.actionLink.slice(0, 120),
    });
    return input.actionLink;
  }
}

async function generateInviteLink(input: {
  email: string;
  redirectTo: string;
  role: InviteRole;
  fullName: string;
  firstName: string;
  lastName: string;
  phone: string;
}) {
  const generated = await supabaseAdmin.auth.admin.generateLink({
    type: "invite",
    email: input.email,
    options: {
      redirectTo: input.redirectTo,
      data: {
        role: input.role,
        displayName: input.fullName || undefined,
        display_name: input.fullName || undefined,
        full_name: input.fullName || undefined,
        firstName: input.firstName || undefined,
        first_name: input.firstName || undefined,
        lastName: input.lastName || undefined,
        last_name: input.lastName || undefined,
        phone: input.phone || undefined,
      },
    },
  });

  if (generated.error || !generated.data?.user) {
    throw generated.error || new Error("Failed to generate invitation link");
  }

  const inviteLink = generated.data?.properties?.action_link;
  if (!inviteLink) {
    throw new Error("Supabase did not return an invitation action link");
  }

  return {
    user: generated.data.user,
    inviteLink,
  };
}

export async function POST(request: Request) {
  try {
    await requireAuthorizedUser(request.headers.get("authorization"), ["admin"]);

    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    const firstName = String(body?.firstName || "").trim();
    const lastName = String(body?.lastName || "").trim();
    const phone = String(body?.phone || "").trim();
    const role = canonicalizeUserRole(String(body?.role || "")) as InviteRole | string;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("A valid email address is required");
    }

    if (!["admin", "greeter", "heathrow"].includes(role)) {
      throw new Error("Please choose a supported staff role");
    }

    const fullName = `${firstName} ${lastName}`.trim();
    const roleUpper = role.toUpperCase() as "ADMIN" | "GREETER" | "HEATHROW";
    const finalDestination = getInviteDestination(role as InviteRole);
    const baseUrl = toAbsoluteBaseUrl(getBaseUrl(request));
    const redirectTo = `${baseUrl}/auth/callback?next=${encodeURIComponent(finalDestination)}`;

    let user = await findAuthUserByEmail(email);
    let invitationSent = false;

    if (!user) {
      const generated = await generateInviteLink({
        email,
        redirectTo,
        role: role as InviteRole,
        fullName,
        firstName,
        lastName,
        phone,
      });
      const inviteLink = normalizeInviteActionLink({
        actionLink: generated.inviteLink,
        baseUrl,
        finalDestination,
      });

      const inviteEmail = buildStaffInvitationEmail({
        email,
        role: role as InviteRole,
        inviteLink,
        fullName: fullName || undefined,
      });
      await sendTransactionalEmail({
        to: email,
        subject: inviteEmail.subject,
        html: inviteEmail.html,
        text: inviteEmail.text,
      });

      user = generated.user;
      invitationSent = true;
    } else {
      const updated = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...(user.user_metadata || {}),
          role,
          displayName: fullName || user.user_metadata?.displayName || undefined,
          display_name: fullName || user.user_metadata?.display_name || undefined,
          full_name: fullName || user.user_metadata?.full_name || undefined,
          firstName: firstName || user.user_metadata?.firstName || undefined,
          first_name: firstName || user.user_metadata?.first_name || undefined,
          lastName: lastName || user.user_metadata?.lastName || undefined,
          last_name: lastName || user.user_metadata?.last_name || undefined,
          phone: phone || user.user_metadata?.phone || undefined,
        },
      });

      if (updated.error || !updated.data.user) {
        throw updated.error || new Error("Failed to update staff access");
      }

      user = updated.data.user;
    }

    await createUserProfile(user.id, {
      email,
      role: roleUpper,
      displayName: fullName || undefined,
      firstName: firstName || undefined,
      first_name: firstName || undefined,
      lastName: lastName || undefined,
      last_name: lastName || undefined,
      phone: phone || undefined,
      phoneNumber: phone || undefined,
    });

    return NextResponse.json({
      success: true,
      message: invitationSent ? "Invitation sent successfully." : "Staff access updated successfully.",
      user: {
        id: user.id,
        email: user.email,
        role,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to invite staff member",
      },
      { status: getStatusCode(error) }
    );
  }
}
