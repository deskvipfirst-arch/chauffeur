import { NextRequest, NextResponse } from "next/server";
import { upsertExtraCharge } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body?.id) {
      return NextResponse.json({ error: "Extra charge id is required" }, { status: 400 });
    }

    const result = await upsertExtraCharge({
      id: String(body.id),
      type: String(body.type || body.id),
      amount: Number(body.amount || 0),
      description: String(body.description || ""),
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to add extra charge";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
