import { describe, expect, it } from "vitest";
import { buildAssignmentUpdate, buildGreeterActionUpdate, validateGreeterPayload } from "./jobLifecycle";

describe("dispatch and greeter API helpers", () => {
  it("builds an assigned payload for admin dispatch", () => {
    expect(buildAssignmentUpdate("driver-42")).toMatchObject({
      driver_id: "driver-42",
      driver_status: "assigned",
      status: "assigned",
    });
  });

  it("builds an accept payload for greeter actions", () => {
    expect(buildGreeterActionUpdate("accept", "driver-42")).toMatchObject({
      driver_id: "driver-42",
      driver_status: "accepted",
      status: "accepted",
    });
  });

  it("builds a pickup payload for greeter actions", () => {
    expect(buildGreeterActionUpdate("pickup", "driver-42")).toMatchObject({
      driver_id: "driver-42",
      driver_status: "picked_up",
      status: "picked_up",
    });
  });

  it("builds a completion payload for greeter actions", () => {
    expect(buildGreeterActionUpdate("complete", "driver-42")).toMatchObject({
      driver_id: "driver-42",
      driver_status: "completed",
      status: "completed",
    });
  });

  it("rejects an invalid greeter action", () => {
    expect(buildGreeterActionUpdate("pause", "driver-42")).toBeNull();
  });

  it("validates required greeter payload fields", () => {
    expect(validateGreeterPayload("", "accept")).toEqual({
      valid: false,
      error: "Email and action are required",
    });
  });

  it("rejects unsupported greeter actions", () => {
    expect(validateGreeterPayload("greeter@example.com", "pause")).toEqual({
      valid: false,
      error: "Invalid job action",
    });
  });

  it("accepts valid greeter payloads", () => {
    expect(validateGreeterPayload("greeter@example.com", "complete")).toEqual({
      valid: true,
      error: null,
    });
  });
});
