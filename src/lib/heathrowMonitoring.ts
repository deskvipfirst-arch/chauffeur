export function isHeathrowJob(booking: {
  pickup_location?: string | null;
  dropoff_location?: string | null;
  service_type?: string | null;
}) {
  const combined = `${booking.pickup_location || ""} ${booking.dropoff_location || ""}`.toLowerCase();
  return combined.includes("heathrow") || combined.includes("terminal 2") || combined.includes("terminal 3") || combined.includes("terminal 4") || combined.includes("terminal 5");
}

export function getMonitoringPriority(status?: string | null) {
  switch (status) {
    case "assigned":
      return "Dispatch Ready";
    case "accepted":
      return "Greeter En Route";
    case "picked_up":
      return "Passenger Met";
    case "completed":
      return "Complete";
    default:
      return "Awaiting Action";
  }
}

export function filterHeathrowBookings<T extends {
  pickup_location?: string | null;
  dropoff_location?: string | null;
}>(bookings: T[]) {
  return bookings.filter(isHeathrowJob);
}
