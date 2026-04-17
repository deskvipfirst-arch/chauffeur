import { describe, expect, it } from "vitest";
import { shouldRefreshOnVisibility } from "./liveJobs";

describe("live job refresh helpers", () => {
  it("refreshes when the page becomes visible", () => {
    expect(shouldRefreshOnVisibility("visible")).toBe(true);
  });

  it("does not refresh when the page is hidden", () => {
    expect(shouldRefreshOnVisibility("hidden")).toBe(false);
  });
});
