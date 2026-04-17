export type AppNotification = {
  title: string;
  message: string;
  audience: "admin" | "greeter" | "user";
  level: "info" | "success" | "warning";
};

export function buildUnauthorizedNotification(area: "admin" | "greeter") {
  return {
    title: "Access denied",
    message: `You do not have permission to access the ${area} area.`,
    audience: "user",
    level: "warning",
  } as const;
}

export function buildAssignmentNotification(bookingRef: string) {
  return {
    title: "Greeter assigned",
    message: `Booking ${bookingRef} has been assigned to a greeter.`,
    audience: "admin",
    level: "success",
  } as const;
}

export function buildGreeterStatusNotification(status: string, bookingRef: string) {
  const labels: Record<string, string> = {
    accepted: "accepted by greeter",
    picked_up: "picked up",
    completed: "completed",
  };

  return {
    title: "Job status updated",
    message: `Booking ${bookingRef} was ${labels[status] || status}.`,
    audience: "admin",
    level: status === "completed" ? "success" : "info",
  } as const;
}
