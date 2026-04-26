import { NextRequest, NextResponse } from "next/server";

import { COLLECTIONS } from "@/lib/types";
import { canonicalizeUserRole } from "@/lib/roles";
import { requireAuthorizedUser, supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    await requireAuthorizedUser(request.headers.get("authorization"), ["admin"]);

    const { data, error } = await supabaseAdmin
      .from(COLLECTIONS.USERS)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const officeStaff = (data || []).filter((row) => {
      const role = canonicalizeUserRole(String((row as Record<string, unknown>).role || "user"));
      return role === "admin" || role === "heathrow";
    });

    return NextResponse.json(officeStaff);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch office staff";
    const status = message === "Forbidden" ? 403 : message.includes("authorization") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
