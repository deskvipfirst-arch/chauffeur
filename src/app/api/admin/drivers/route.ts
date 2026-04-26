import { NextRequest, NextResponse } from "next/server";
import { getDrivers, requireAuthorizedUser } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    await requireAuthorizedUser(request.headers.get("authorization"), ["admin"]);
    const drivers = await getDrivers();
    return NextResponse.json(drivers);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch drivers";
    const status = message === "Forbidden" ? 403 : message.includes("authorization") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
