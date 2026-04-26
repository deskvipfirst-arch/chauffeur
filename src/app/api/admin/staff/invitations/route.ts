import { NextResponse } from "next/server";

import { canonicalizeUserRole } from "@/lib/roles";
import { requireAuthorizedUser, supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type StaffRole = "admin" | "greeter" | "heathrow";

type StaffInvitationRecord = {
  id: string;
  email: string;
  role: StaffRole;
  firstName: string | null;
  lastName: string | null;
  invitedAt: string | null;
  acceptedAt: string | null;
  status: "pending" | "accepted";
};

type StaffAuthUserLike = {
  id: string;
  email?: string | null;
  created_at?: string | null;
  user_metadata?: Record<string, unknown>;
  last_sign_in_at?: string | null;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
  invited_at?: string | null;
};

function toStaffRole(value: string): StaffRole | null {
  const role = canonicalizeUserRole(value);
  if (role === "admin" || role === "greeter" || role === "heathrow") {
    return role;
  }
  return null;
}

export async function GET(request: Request) {
  try {
    await requireAuthorizedUser(request.headers.get("authorization"), ["admin"]);

    const url = new URL(request.url);
    const statusFilter = String(url.searchParams.get("status") || "pending").toLowerCase();

    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) {
      throw error;
    }

    const records: StaffInvitationRecord[] = data.users
      .map((user) => {
        const authUser = user as StaffAuthUserLike;
        const metadata = (authUser.user_metadata || {}) as Record<string, unknown>;
        const role = toStaffRole(String(metadata.role || ""));
        if (!role) {
          return null;
        }

        const email = String(authUser.email || "").trim().toLowerCase();
        const acceptedAt =
          String(authUser.last_sign_in_at || authUser.email_confirmed_at || authUser.confirmed_at || "").trim() ||
          null;
        const invitedAt = String(authUser.invited_at || authUser.created_at || "").trim() || null;
        const status = acceptedAt ? "accepted" : "pending";

        return {
          id: authUser.id,
          email,
          role,
          firstName: String(metadata.first_name || metadata.firstName || "").trim() || null,
          lastName: String(metadata.last_name || metadata.lastName || "").trim() || null,
          invitedAt,
          acceptedAt,
          status,
        } satisfies StaffInvitationRecord;
      })
      .filter((record): record is StaffInvitationRecord => Boolean(record))
      .filter((record) => {
        if (statusFilter === "all") {
          return true;
        }
        return record.status === statusFilter;
      })
      .sort((left, right) => {
        const leftTime = left.invitedAt ? new Date(left.invitedAt).getTime() : 0;
        const rightTime = right.invitedAt ? new Date(right.invitedAt).getTime() : 0;
        return rightTime - leftTime;
      });

    return NextResponse.json(records);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch staff invitations";
    const status = message === "Forbidden" ? 403 : message.includes("authorization") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
