import { describe, expect, it } from "vitest";
import { buildUnauthorizedNotification } from "./notifications";

describe("authorization notifications", () => {
  it("builds an admin access denied message", () => {
    expect(buildUnauthorizedNotification("admin")).toMatchObject({
      title: "Access denied",
      audience: "user",
      level: "warning",
    });
  });

  it("builds a greeter access denied message", () => {
    expect(buildUnauthorizedNotification("greeter").message).toContain("greeter");
  });
});
