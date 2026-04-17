import { describe, expect, it } from "vitest";
import { buildAssignmentUpdate, getNextJobAction, normalizeBookingAmount } from "./jobLifecycle";

describe("job lifecycle", () => {
  it("advances assigned jobs to accepted", () => {
    expect(getNextJobAction("assigned")).toEqual({
      action: "accept",
      nextStatus: "accepted",
    });
  });

  it("advances accepted jobs to picked up", () => {
    expect(getNextJobAction("accepted")).toEqual({
      action: "pickup",
      nextStatus: "picked_up",
    });
  });

  it("advances picked up jobs to completed", () => {
    expect(getNextJobAction("picked_up")).toEqual({
      action: "complete",
      nextStatus: "completed",
    });
  });

  it("creates dispatch assignment payloads", () => {
    expect(buildAssignmentUpdate("driver-123")).toMatchObject({
      driver_id: "driver-123",
      driver_status: "assigned",
      status: "assigned",
    });
  });

  it("creates unassign payloads", () => {
    expect(buildAssignmentUpdate(null)).toEqual({
      driver_id: null,
      driver_status: "unassigned",
      assigned_at: null,
    });
  });

  it("normalizes booking amounts", () => {
    expect(normalizeBookingAmount(125.678)).toBe(125.68);
    expect(normalizeBookingAmount(undefined)).toBe(0);
  });
});
