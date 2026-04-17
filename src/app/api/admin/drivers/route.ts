import { NextResponse } from "next/server";
import { getDrivers } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const drivers = await getDrivers();
    return NextResponse.json(drivers);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch drivers";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
