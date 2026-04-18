import { describe, expect, it } from "vitest";
import { canonicalizeUserRole, isAllowedRole } from "./roles";

describe("admin role compatibility", () => {
  it("maps legacy driver-style roles to greeter access", () => {
    expect(canonicalizeUserRole("driver")).toBe("greeter");
    expect(canonicalizeUserRole("GREETER")).toBe("greeter");
  });

  it("accepts greeter aliases when checking access", () => {
    expect(isAllowedRole("driver", ["greeter"])).toBe(true);
    expect(isAllowedRole("office", ["admin"])).toBe(true);
    expect(isAllowedRole("user", ["admin"])).toBe(false);
  });
});
