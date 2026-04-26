import { NextRequest, NextResponse } from "next/server";
import { updateExtraCharge } from "@/lib/supabase/admin";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const result = await updateExtraCharge(params.id, {
      amount: Number(body.amount || 0),
      description: String(body.description || ""),
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update extra charge";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
