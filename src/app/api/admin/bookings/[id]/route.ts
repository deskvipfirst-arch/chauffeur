import { NextRequest, NextResponse } from "next/server";
import { requireAuthorizedUser, updateBooking } from "@/lib/supabase-admin";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuthorizedUser(request.headers.get("authorization"), ["admin"]);
    const body = await request.json();
    const updated = await updateBooking(params.id, body);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update booking";
    const status = message === "Forbidden" ? 403 : message.includes("authorization") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
