import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getBooking, getDriverById } from "@/lib/supabase-admin";

const ASSIGNED_STATUSES = new Set(["assigned", "accepted", "picked_up", "completed"]);

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const booking = await getBooking(params.id);

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (String(booking.user_id) !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const driverStatus = String(booking.driver_status || "").toLowerCase();

    if (!booking.driver_id || !ASSIGNED_STATUSES.has(driverStatus)) {
      return NextResponse.json({ greeter: null }, { status: 200 });
    }

    const driver = await getDriverById(String(booking.driver_id));

    if (!driver) {
      return NextResponse.json({ greeter: null }, { status: 200 });
    }

    return NextResponse.json({
      greeter: {
        name: [driver.firstName, driver.lastName].filter(Boolean).join(" ") || driver.full_name || "Your greeter",
        phone: driver.phone || null,
        email: driver.email || null,
        status: driverStatus,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch greeter details";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
