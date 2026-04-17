import { describe, expect, it } from "vitest";
import { buildAssignmentUpdate, buildGreeterActionUpdate, getNextJobAction } from "./jobLifecycle";
import { getGreeterActionConfig } from "./greeterUi";

describe("dispatch to greeter integration", () => {
  it("keeps admin assignment and greeter action flow aligned", () => {
    const assigned = buildAssignmentUpdate("driver-9");
    expect(assigned.status).toBe("assigned");
    expect(getGreeterActionConfig(String(assigned.driver_status))).toEqual({
      label: "Accept Job",
      action: "accept",
    });
  });

  it("matches lifecycle next action to the greeter button", () => {
    const nextAction = getNextJobAction("accepted");
    const uiAction = getGreeterActionConfig("accepted");

    expect(nextAction?.action).toBe(uiAction?.action);
  });

  it("produces a completed status after the final greeter action", () => {
    const completed = buildGreeterActionUpdate("complete", "driver-9");
    expect(completed).toMatchObject({
      driver_id: "driver-9",
      driver_status: "completed",
      status: "completed",
    });
  });
});
