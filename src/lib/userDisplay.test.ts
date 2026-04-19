import { describe, expect, it } from "vitest";
import { getUserDisplayName, getUserFirstName } from "./userDisplay";

describe("user display helpers", () => {
  it("prefers stored profile names when available", () => {
    expect(getUserFirstName({ firstName: "Jane" }, null)).toBe("Jane");
    expect(getUserDisplayName({ firstName: "Jane", lastName: "Smith" }, null)).toBe("Jane Smith");
  });

  it("falls back to auth display name when the profile row is missing", () => {
    const user = { displayName: "Alex Taylor", email: "alex@example.com" };

    expect(getUserFirstName(null, user)).toBe("Alex");
    expect(getUserDisplayName(null, user)).toBe("Alex Taylor");
  });

  it("derives a friendly name from the email when needed", () => {
    const user = { displayName: null, email: "john.doe@example.com" };

    expect(getUserFirstName(null, user)).toBe("John");
    expect(getUserDisplayName(null, user)).toBe("John Doe");
  });
});
