import { NextResponse } from "next/server";
import { getExtraCharges } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const extraCharges = await getExtraCharges();
    return NextResponse.json(extraCharges);
  } catch {
    return NextResponse.json([]);
  }
}
