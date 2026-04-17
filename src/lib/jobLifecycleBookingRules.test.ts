import { describe, expect, it } from "vitest";
import { getNextJobAction } from "./jobLifecycle";

describe("booking workflow safety", () => {
  it("does not expose a greeter action for pending bookings", () => {
    expect(getNextJobAction("pending")).toBeNull();
  });

  it("does not expose a greeter action for completed bookings", () => {
    expect(getNextJobAction("completed")).toBeNull();
  });

  it("does not expose a greeter action for cancelled bookings", () => {
    expect(getNextJobAction("cancelled")).toBeNull();
  });
});
