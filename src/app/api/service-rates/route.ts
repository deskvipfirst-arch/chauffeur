import { NextResponse } from "next/server";
import { getServiceRates } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const serviceRates = await getServiceRates();
    return NextResponse.json(serviceRates);
  } catch {
    return NextResponse.json([]);
  }
}
