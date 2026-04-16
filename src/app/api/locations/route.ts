import { NextResponse } from "next/server";
import { getLocations } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const locations = await getLocations();
    return NextResponse.json(locations);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch locations";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 