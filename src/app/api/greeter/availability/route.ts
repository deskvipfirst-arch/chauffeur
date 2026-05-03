import { NextRequest, NextResponse } from "next/server";
import {
  createDriverByEmail,
  getDriverByEmail,
  requireAuthorizedUser,
  updateDriverStatusByEmail,
} from "@/lib/supabase/admin";

function parseRequestedEmail(request: NextRequest) {
  return String(request.nextUrl.searchParams.get("email") || "")
    .trim()
    .toLowerCase();
}

function statusToAvailability(status: unknown) {
  return String(status || "inactive").toLowerCase() === "active" ? "available" : "unavailable";
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthorizedUser(request.headers.get("authorization"), ["greeter", "admin"]);
    const requestedEmail = parseRequestedEmail(request);
    const effectiveEmail = auth.role === "admin" ? requestedEmail || auth.email : auth.email;

    if (!effectiveEmail) {
      return NextResponse.json({ error: "Email not found" }, { status: 400 });
    }

    if (auth.role !== "admin" && requestedEmail && requestedEmail !== auth.email) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const driver = await getDriverByEmail(effectiveEmail);
    const status = String(driver?.status || "inactive").toLowerCase() === "active" ? "active" : "inactive";

    return NextResponse.json({
      email: effectiveEmail,
      status,
      availability: statusToAvailability(status),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch availability";
    const status = message === "Forbidden" ? 403 : message.includes("authorization") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuthorizedUser(request.headers.get("authorization"), ["greeter", "admin"]);
    const body = (await request.json()) as { available?: boolean; email?: string };

    const requestedEmail = String(body?.email || "").trim().toLowerCase();
    const effectiveEmail = auth.role === "admin" ? requestedEmail || auth.email : auth.email;

    if (!effectiveEmail) {
      return NextResponse.json({ error: "Email not found" }, { status: 400 });
    }

    if (auth.role !== "admin" && requestedEmail && requestedEmail !== auth.email) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const nextStatus = body?.available === true ? "active" : "inactive";
    let updated = await updateDriverStatusByEmail(effectiveEmail, nextStatus);
    if (!updated) {
      try {
        updated = await createDriverByEmail(effectiveEmail, nextStatus);
      } catch {
        // If creation races with another request (or an existing row appears),
        // retry the update path instead of failing the toggle.
        updated = await updateDriverStatusByEmail(effectiveEmail, nextStatus);
      }
    }
    const status = String(updated?.status || nextStatus).toLowerCase() === "active" ? "active" : "inactive";

    return NextResponse.json({
      email: effectiveEmail,
      status,
      availability: statusToAvailability(status),
    });
  } catch (error: unknown) {
    console.error("[greeter/availability PATCH]", error);
    const message = error instanceof Error ? error.message : "Failed to update availability";
    const statusCode = message === "Forbidden" ? 403 : message.toLowerCase().includes("authorization") || message.toLowerCase().includes("token") ? 401 : 500;
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
