import { describe, expect, it } from "vitest";
import { getGreeterActionConfig, getGreeterStatusLabel } from "./greeterUi";

describe("greeter UI helpers", () => {
  it("shows a readable label for picked up jobs", () => {
    expect(getGreeterStatusLabel("picked_up")).toBe("Picked Up");
  });

  it("shows a readable label for assigned jobs", () => {
    expect(getGreeterStatusLabel("assigned")).toBe("Assigned");
  });

  it("returns accept action for assigned jobs", () => {
    expect(getGreeterActionConfig("assigned")).toEqual({
      label: "Accept Job",
      action: "accept",
    });
  });

  it("returns pickup action for accepted jobs", () => {
    expect(getGreeterActionConfig("accepted")).toEqual({
      label: "Confirm Pickup",
      action: "pickup",
    });
  });

  it("returns complete action for picked up jobs", () => {
    expect(getGreeterActionConfig("picked_up")).toEqual({
      label: "Complete Job",
      action: "complete",
    });
  });

  it("does not show an action for completed jobs", () => {
    expect(getGreeterActionConfig("completed")).toBeNull();
  });

  it("does not show an action for cancelled jobs", () => {
    expect(getGreeterActionConfig("cancelled")).toBeNull();
  });
});
