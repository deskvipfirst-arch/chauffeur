export type JobLifecycleStatus = "pending" | "confirmed" | "assigned" | "accepted" | "picked_up" | "completed" | "cancelled";

export function getNextJobAction(status: JobLifecycleStatus) {
  switch (status) {
    case "assigned":
      return { action: "accept", nextStatus: "accepted" as const };
    case "accepted":
      return { action: "pickup", nextStatus: "picked_up" as const };
    case "picked_up":
      return { action: "complete", nextStatus: "completed" as const };
    default:
      return null;
  }
}

export function buildAssignmentUpdate(driverId: string | null) {
  if (!driverId) {
    return {
      driver_id: null,
      driver_status: "unassigned",
      assigned_at: null,
    };
  }

  return {
    driver_id: driverId,
    driver_status: "assigned",
    status: "assigned",
  };
}

export function normalizeBookingAmount(amount: number | null | undefined) {
  return Number((amount || 0).toFixed(2));
}

export function buildGreeterActionUpdate(action: string, driverId: string) {
  const now = new Date().toISOString();
  const actionMap: Record<string, Record<string, string>> = {
    accept: { driver_status: "accepted", status: "accepted", accepted_at: now },
    pickup: { driver_status: "picked_up", status: "picked_up", picked_up_at: now },
    complete: { driver_status: "completed", status: "completed", completed_at: now },
  };

  const updates = actionMap[action];
  if (!updates) {
    return null;
  }

  return {
    ...updates,
    driver_id: driverId,
  };
}

export function validateGreeterPayload(email: string, action: string) {
  if (!email || !action) {
    return { valid: false, error: "Email and action are required" };
  }

  if (!buildGreeterActionUpdate(action, "driver-check")) {
    return { valid: false, error: "Invalid job action" };
  }

  return { valid: true, error: null };
}
