import { NextRequest, NextResponse } from "next/server";
import { getDriverByEmail, requireAuthorizedUser, updateBooking } from "@/lib/supabase/admin";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuthorizedUser(request.headers.get("authorization"), ["greeter", "admin"]);
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const action = String(body.action || "");

    if (!email || !action) {
      return NextResponse.json({ error: "Email and action are required" }, { status: 400 });
    }

    if (auth.role !== "admin" && email !== auth.email) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    const status = message === "Forbidden" ? 403 : message.includes("authorization") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
