import { supabaseAdmin, findUserByEmail } from "@/lib/supabase/admin";
import { buildInviteCallbackUrl, extractTokensFromInviteUrl, getBaseUrl } from "@/lib/url";

interface InviteOptions {
  email: string;
  role: "admin" | "greeter" | "heathrow";
  firstName?: string;
  lastName?: string;
  phone?: string;
  invitedBy?: string;
}

function logInviteService(event: string, details: Record<string, unknown>) {
  console.info("[invite-flow]", event, details);
}

function assertValidInviteBaseUrl(baseUrl: string) {
  const normalizedBaseUrl = String(baseUrl || "").trim().toLowerCase();
  if (!/^https?:\/\//.test(normalizedBaseUrl)) {
    throw new Error(`Invalid base URL format: ${baseUrl}. Must include protocol.`);
  }

  if (normalizedBaseUrl.includes("supabase.co")) {
    throw new Error(`Invalid base URL: ${baseUrl} points to Supabase, not your app domain.`);
  }
}

export async function createInvite(options: InviteOptions, request?: Request) {
  const baseUrl = getBaseUrl(request);
  assertValidInviteBaseUrl(baseUrl);

  const fullName = `${options.firstName || ""} ${options.lastName || ""}`.trim();

  // Supabase generateLink does not reliably preserve query params in redirectTo.
  const redirectTo = `${baseUrl}/auth/callback`;

  logInviteService("create-invite-generate-link", {
    email: options.email,
    role: options.role,
    baseUrl,
    redirectTo,
  });

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "invite",
    email: options.email,
    options: {
      redirectTo,
      data: {
        role: options.role,
        first_name: options.firstName,
        last_name: options.lastName,
        phone: options.phone,
        full_name: fullName,
        needs_password_setup: true,
        invited_by: options.invitedBy,
      },
    },
  });

  if (error || !data?.properties?.action_link) {
    throw new Error(error?.message || "Failed to generate invite link");
  }

  const destination = options.role === "greeter" ? "/greeter/signin" : "/administrator/signin";

  // Use hashed_token from generateLink to build a direct link to our own
  // /auth/callback page. This bypasses Supabase's redirect mechanism entirely,
  // avoiding broken redirects caused by Dashboard Site URL misconfiguration.
  const hashedToken = data.properties.hashed_token;
  const cleanInviteUrl = hashedToken
    ? `${baseUrl}/auth/callback?token_hash=${encodeURIComponent(hashedToken)}&type=invite&next=${encodeURIComponent(destination)}`
    : buildInviteCallbackUrl(baseUrl, extractTokensFromInviteUrl(data.properties.action_link), destination);

  logInviteService("create-invite-link", {
    email: options.email,
    role: options.role,
    destination,
    hashedToken: Boolean(hashedToken),
    inviteUrl: cleanInviteUrl,
  });

  return {
    user: data.user,
    inviteLink: cleanInviteUrl,
  };
}

export async function resendInvite(email: string, request?: Request) {
  const user = await findUserByEmail(email);
  if (!user) throw new Error("User not found");

  const role = String(user.user_metadata?.role || "").toLowerCase();
  if (!role || !["admin", "greeter", "heathrow"].includes(role)) {
    throw new Error("Invalid user role for invite");
  }

  return createInvite(
    {
      email,
      role: role as "admin" | "greeter" | "heathrow",
      firstName: String(user.user_metadata?.first_name || user.user_metadata?.firstName || "") || undefined,
      lastName: String(user.user_metadata?.last_name || user.user_metadata?.lastName || "") || undefined,
      phone: String(user.user_metadata?.phone || "") || undefined,
    },
    request
  );
}

export async function revokeInvite(userId: string) {
  await supabaseAdmin.from("users").delete().eq("id", userId);

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);

  return true;
}
