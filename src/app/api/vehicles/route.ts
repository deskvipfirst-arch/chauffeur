import { NextResponse } from "next/server";
import { getVehicles } from "@/lib/firebase-admin";

export async function GET() {
  try {
    const vehicles = await getVehicles();
    return NextResponse.json(vehicles);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch vehicles";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 