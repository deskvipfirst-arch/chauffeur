import { NextResponse } from "next/server";

import { getBaseUrl } from "@/lib/base-url";
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
    const finalDestination = role === "greeter" ? "/greeter/signin" : "/administrator/signin";
    const redirectTo = `${getBaseUrl(request)}/auth/callback?next=${encodeURIComponent(finalDestination)}`;

    let user = await findAuthUserByEmail(email);

    if (!user) {
      const invited = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: {
          role,
          displayName: fullName || undefined,
          display_name: fullName || undefined,
          full_name: fullName || undefined,
          firstName: firstName || undefined,
          first_name: firstName || undefined,
          lastName: lastName || undefined,
          last_name: lastName || undefined,
          phone: phone || undefined,
        },
      });

      if (invited.error || !invited.data.user) {
        throw invited.error || new Error("Failed to invite staff member");
      }

      user = invited.data.user;
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
      message: user.created_at === user.updated_at ? "Invitation sent successfully." : "Staff access updated successfully.",
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
