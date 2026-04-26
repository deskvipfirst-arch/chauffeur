import { NextRequest, NextResponse } from "next/server";
import { updateServiceRate } from "@/lib/supabase/admin";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const result = await updateServiceRate(params.id, {
      baseRate: Number(body.baseRate || 0),
      description: String(body.description || ""),
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update service rate";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
