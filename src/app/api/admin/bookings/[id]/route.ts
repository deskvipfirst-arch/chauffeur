import { NextRequest, NextResponse } from "next/server";
import { updateBooking } from "@/lib/supabase-admin";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const updated = await updateBooking(params.id, body);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update booking";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
