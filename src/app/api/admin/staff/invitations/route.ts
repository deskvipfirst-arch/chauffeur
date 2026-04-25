import { NextResponse } from "next/server";

import { canonicalizeUserRole } from "@/lib/roles";
import { requireAuthorizedUser, supabaseAdmin } from "@/lib/supabase-admin";

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
        const metadata = (user.user_metadata || {}) as Record<string, unknown>;
        const role = toStaffRole(String(metadata.role || ""));
        if (!role) {
          return null;
        }

        const email = String(user.email || "").trim().toLowerCase();
        const acceptedAt =
          String((user as any).last_sign_in_at || (user as any).email_confirmed_at || (user as any).confirmed_at || "").trim() ||
          null;
        const invitedAt = String((user as any).invited_at || user.created_at || "").trim() || null;
        const status = acceptedAt ? "accepted" : "pending";

        return {
          id: user.id,
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
