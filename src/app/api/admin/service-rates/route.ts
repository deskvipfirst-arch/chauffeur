import { NextRequest, NextResponse } from "next/server";
import { upsertServiceRate } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body?.id) {
      return NextResponse.json({ error: "Service rate id is required" }, { status: 400 });
    }

    const result = await upsertServiceRate({
      id: String(body.id),
      type: String(body.type || body.id),
      baseRate: Number(body.baseRate || 0),
      description: String(body.description || ""),
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to add service rate";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
