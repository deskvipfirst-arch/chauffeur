import { NextRequest, NextResponse } from "next/server";
import { createGreeterInvoice, getGreeterInvoices, requireAuthorizedUser } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthorizedUser(request.headers.get("authorization"), ["greeter", "admin"]);
    const requestedEmail = String(request.nextUrl.searchParams.get("email") || "").trim().toLowerCase();
    const email = auth.role === "admin" ? requestedEmail || auth.email : auth.email;

    if (auth.role !== "admin" && requestedEmail && requestedEmail !== auth.email) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const invoices = await getGreeterInvoices(email || undefined);
    return NextResponse.json(invoices);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch greeter invoices";
    const status = message === "Forbidden" ? 403 : message.includes("authorization") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthorizedUser(request.headers.get("authorization"), ["greeter", "admin"]);
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const bookingId = String(body.bookingId || "").trim();
    const amount = Number(body.amount || 0);
    const notes = typeof body.notes === "string" ? body.notes : "";

    if (!email || !bookingId || !amount || amount <= 0) {
      return NextResponse.json({ error: "Email, booking and amount are required" }, { status: 400 });
    }

    if (auth.role !== "admin" && email !== auth.email) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const created = await createGreeterInvoice({
      email,
      bookingId,
      amount,
      notes,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to submit invoice";
    const status = message === "Forbidden" ? 403 : message.includes("authorization") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
