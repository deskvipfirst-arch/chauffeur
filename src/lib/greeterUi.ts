export function getGreeterStatusLabel(status: string) {
  const statusLabel: Record<string, string> = {
    assigned: "Assigned",
    accepted: "Accepted",
    picked_up: "Picked Up",
    completed: "Completed",
    confirmed: "Confirmed",
    pending: "Pending",
    cancelled: "Cancelled",
  };

  return statusLabel[status] || status;
}

export function getGreeterActionConfig(status: string) {
  const actionConfig: Record<string, { label: string; action: string } | null> = {
    assigned: { label: "Accept Job", action: "accept" },
    accepted: { label: "Confirm Pickup", action: "pickup" },
    picked_up: { label: "Complete Job", action: "complete" },
    completed: null,
    confirmed: null,
    pending: null,
    cancelled: null,
  };

  return actionConfig[status] ?? null;
}
