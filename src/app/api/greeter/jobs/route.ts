import { NextRequest, NextResponse } from "next/server";
import { getBookingsForDriverEmail, requireAuthorizedUser } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthorizedUser(request.headers.get("authorization"), ["greeter", "admin"]);
    const requestedEmail = String(request.nextUrl.searchParams.get("email") || "").trim().toLowerCase();
    const effectiveEmail = auth.role === "admin" ? requestedEmail || auth.email : auth.email;

    if (!effectiveEmail) {
      return NextResponse.json([], { status: 200 });
    }

    if (auth.role !== "admin" && requestedEmail && requestedEmail !== auth.email) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const jobs = await getBookingsForDriverEmail(effectiveEmail);
    return NextResponse.json(jobs);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch greeter jobs";
    const status = message === "Forbidden" ? 403 : message.includes("authorization") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
