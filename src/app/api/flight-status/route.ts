import { NextRequest, NextResponse } from "next/server";
import {
  buildFallbackFlightStatus,
  buildFlightStatusRequestUrl,
  normalizeFlightNumber,
  parseFlightStatusResponse,
} from "@/lib/flightStatus";

export async function GET(request: NextRequest) {
  const flightNumber = normalizeFlightNumber(request.nextUrl.searchParams.get("flight"));

  if (!flightNumber) {
    return NextResponse.json({ error: "Flight number is required" }, { status: 400 });
  }

  const apiUrlTemplate = process.env.FLIGHT_STATUS_API_URL;
  const apiKey = process.env.FLIGHT_STATUS_API_KEY;

  if (apiUrlTemplate && apiKey) {
    try {
      const response = await fetch(buildFlightStatusRequestUrl(apiUrlTemplate, flightNumber), {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "x-api-key": apiKey,
        },
        cache: "no-store",
      });

      if (response.ok) {
        const payload = await response.json();
        const parsed = parseFlightStatusResponse(payload, flightNumber);
        if (parsed) {
          return NextResponse.json(parsed);
        }
      }
    } catch {
      // Fall back below when the remote provider is unavailable.
    }
  }

  return NextResponse.json(buildFallbackFlightStatus(flightNumber));
}
