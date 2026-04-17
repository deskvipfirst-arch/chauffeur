import { NextRequest, NextResponse } from "next/server";
import { getDriverByEmail, updateBooking } from "@/lib/supabase-admin";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const email = String(body.email || "");
    const action = String(body.action || "");

    if (!email || !action) {
      return NextResponse.json({ error: "Email and action are required" }, { status: 400 });
    }

    const driver = await getDriverByEmail(email);
    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    const now = new Date().toISOString();
    const actionMap: Record<string, Record<string, string>> = {
      accept: { driver_status: "accepted", status: "accepted", accepted_at: now },
      pickup: { driver_status: "picked_up", status: "picked_up", picked_up_at: now },
      complete: { driver_status: "completed", status: "completed", completed_at: now },
    };

    const updates = actionMap[action];
    if (!updates) {
      return NextResponse.json({ error: "Invalid job action" }, { status: 400 });
    }

    const updated = await updateBooking(params.id, {
      ...updates,
      driver_id: driver.id,
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update greeter job";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
