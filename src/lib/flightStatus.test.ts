import { describe, expect, it } from "vitest";
import {
  buildFallbackFlightStatus,
  buildFlightStatusRequestUrl,
  getPrimaryFlightNumber,
  normalizeFlightNumber,
  parseFlightStatusResponse,
} from "./flightStatus";

describe("flight status helpers", () => {
  it("normalizes flight numbers", () => {
    expect(normalizeFlightNumber(" ba 2490 ")).toBe("BA2490");
  });

  it("uses arrival flight numbers first", () => {
    expect(getPrimaryFlightNumber({ flight_number_arrival: "BA2490", flight_number_departure: "VS1" })).toBe("BA2490");
  });

  it("falls back to departure flight numbers", () => {
    expect(getPrimaryFlightNumber({ flight_number_departure: "VS1" })).toBe("VS1");
  });

  it("builds a fallback status payload", () => {
    expect(buildFallbackFlightStatus("BA2490")).toMatchObject({
      flightNumber: "BA2490",
      source: "fallback",
    });
  });

  it("parses a remote provider payload", () => {
    expect(
      parseFlightStatusResponse({
        data: [
          {
            flight: { iata: "BA2490" },
            flight_status: "boarding",
            departure: { terminal: "5" },
          },
        ],
      })
    ).toMatchObject({
      flightNumber: "BA2490",
      status: "boarding",
      terminal: "5",
      source: "remote",
    });
  });

  it("builds a provider URL from a template", () => {
    expect(buildFlightStatusRequestUrl("https://api.example.com/flights/{flight}", "BA2490")).toBe(
      "https://api.example.com/flights/BA2490"
    );
  });
});
