import { NextRequest, NextResponse } from "next/server";
import { getBookings, requireAuthorizedUser } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    await requireAuthorizedUser(request.headers.get("authorization"), ["admin", "heathrow"]);
    const bookings = await getBookings();
    return NextResponse.json(bookings);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch bookings";
    const status = message === "Forbidden" ? 403 : message.includes("authorization") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
