import { describe, expect, it } from "vitest";
import { buildAssignmentNotification, buildGreeterStatusNotification } from "./notifications";

describe("notifications", () => {
  it("builds a greeter assignment notification", () => {
    expect(buildAssignmentNotification("CHAUF-123")).toMatchObject({
      title: "Greeter assigned",
      audience: "admin",
      level: "success",
    });
  });

  it("builds a status notification for completed jobs", () => {
    expect(buildGreeterStatusNotification("completed", "CHAUF-123")).toMatchObject({
      title: "Job status updated",
      level: "success",
    });
  });

  it("includes the booking ref in status messages", () => {
    expect(buildGreeterStatusNotification("accepted", "CHAUF-123").message).toContain("CHAUF-123");
  });
});
