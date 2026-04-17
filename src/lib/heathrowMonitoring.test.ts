import { describe, expect, it } from "vitest";
import { filterHeathrowBookings, getMonitoringPriority, isHeathrowJob } from "./heathrowMonitoring";

describe("Heathrow monitoring helpers", () => {
  it("detects Heathrow pickup jobs", () => {
    expect(isHeathrowJob({ pickup_location: "Heathrow Terminal 5" })).toBe(true);
  });

  it("detects Heathrow dropoff jobs", () => {
    expect(isHeathrowJob({ dropoff_location: "Heathrow Terminal 3" })).toBe(true);
  });

  it("ignores non-Heathrow jobs", () => {
    expect(isHeathrowJob({ pickup_location: "Gatwick South" })).toBe(false);
  });

  it("filters only Heathrow-related bookings", () => {
    expect(
      filterHeathrowBookings([
        { id: 1, pickup_location: "Heathrow Terminal 2" },
        { id: 2, pickup_location: "London Bridge" },
      ])
    ).toHaveLength(1);
  });

  it("maps assigned jobs to dispatch ready", () => {
    expect(getMonitoringPriority("assigned")).toBe("Dispatch Ready");
  });

  it("maps picked up jobs to passenger met", () => {
    expect(getMonitoringPriority("picked_up")).toBe("Passenger Met");
  });
});
