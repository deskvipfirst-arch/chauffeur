import { NextRequest, NextResponse } from "next/server";
import { getGreeterInvoices, requireAuthorizedUser } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    await requireAuthorizedUser(request.headers.get("authorization"), ["admin"]);
    const invoices = await getGreeterInvoices();
    return NextResponse.json(invoices);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch invoices";
    const status = message === "Forbidden" ? 403 : message.includes("authorization") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
