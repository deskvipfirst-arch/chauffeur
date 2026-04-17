import { NextRequest, NextResponse } from "next/server";
import { getBookingsForDriverEmail } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get("email");
    if (!email) {
      return NextResponse.json([], { status: 200 });
    }

    const jobs = await getBookingsForDriverEmail(email);
    return NextResponse.json(jobs);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch greeter jobs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
