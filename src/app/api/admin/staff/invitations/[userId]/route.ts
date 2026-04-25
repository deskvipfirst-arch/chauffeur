import { NextResponse } from "next/server";

import { getBaseUrl } from "@/lib/base-url";
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
  const redirectPath = role === "greeter" ? "/greeter/signin" : "/administrator/signin";
  const redirectTo = `${getBaseUrl(request)}${redirectPath}`;

  const invited = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: {
      ...(user.user_metadata || {}),
      role,
    },
  });

  if (invited.error) {
    const resendMethod = (supabaseAdmin.auth as any).resend;
    if (typeof resendMethod === "function") {
      const resendResult = await resendMethod({
        type: "signup",
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (resendResult?.error) {
        return NextResponse.json({ error: resendResult.error.message || "Failed to resend invitation" }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: invited.error.message || "Failed to resend invitation" }, { status: 500 });
    }
  }

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
