import { NextRequest, NextResponse } from "next/server";
import { requireAuthorizedUser, reviewGreeterInvoice } from "@/lib/supabase-admin";

const allowedStatuses = new Set(["under_review", "approved", "rejected", "paid"]);

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuthorizedUser(request.headers.get("authorization"), ["admin"]);
    const body = await request.json();
    const officeStatus = String(body.office_status || "");

    if (!allowedStatuses.has(officeStatus)) {
      return NextResponse.json({ error: "Invalid invoice status" }, { status: 400 });
    }

    const updated = await reviewGreeterInvoice(params.id, {
      office_status: officeStatus,
      reviewed_by: String(body.reviewed_by || "office"),
      office_notes: typeof body.office_notes === "string" ? body.office_notes : null,
      payment_reference: typeof body.payment_reference === "string" ? body.payment_reference : null,
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to review invoice";
    const status = message === "Forbidden" ? 403 : message.includes("authorization") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
