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

export function buildInvoiceSubmissionNotification(bookingRef: string, amount?: number) {
  return {
    title: "Invoice submitted",
    message: `Booking ${bookingRef} has a new greeter invoice${amount ? ` for £${Number(amount).toFixed(2)}` : ""}.`,
    audience: "admin",
    level: "warning",
  } as const;
}

export function buildOperationsAlerts({
  bookings,
  invoices,
}: {
  bookings: Array<{ booking_ref?: string | null; driver_status?: string | null; status?: string | null; date_time?: string | null }>;
  invoices: Array<{ booking_ref?: string | null; office_status?: string | null; amount?: number | null }>;
}) {
  const alerts: AppNotification[] = [];

  const now = Date.now();
  const confirmedUnassigned = bookings.filter((booking) => {
    const bookingStatus = String(booking.status || "").toLowerCase();
    const driverStatus = String(booking.driver_status || "unassigned").toLowerCase();
    return bookingStatus === "confirmed" && (!driverStatus || driverStatus === "unassigned");
  });

  if (confirmedUnassigned.length > 0) {
    alerts.push({
      title: "Confirmed bookings awaiting assignment",
      message: `${confirmedUnassigned.length} confirmed booking(s) still need a greeter assignment.`,
      audience: "admin",
      level: "warning",
    });
  }

  const urgentAssignments = confirmedUnassigned.filter((booking) => {
    if (!booking.date_time) return false;
    const serviceTime = new Date(String(booking.date_time)).getTime();
    if (Number.isNaN(serviceTime)) return false;
    const msUntilService = serviceTime - now;
    return msUntilService > 0 && msUntilService <= 24 * 60 * 60 * 1000;
  });

  if (urgentAssignments.length > 0) {
    alerts.push({
      title: "Urgent assignment window",
      message: `${urgentAssignments.length} confirmed booking(s) are within 24 hours and still unassigned.`,
      audience: "admin",
      level: "warning",
    });
  }

  const activeJobs = bookings.filter((booking) =>
    ["assigned", "accepted", "picked_up"].includes(String(booking.driver_status || booking.status || ""))
  );

  if (activeJobs.length > 0) {
    alerts.push({
      title: "Active greeter jobs",
      message: `${activeJobs.length} live job(s) are currently in service.`,
      audience: "admin",
      level: "info",
    });
  }

  const pendingInvoices = invoices.filter((invoice) =>
    ["submitted", "under_review"].includes(String(invoice.office_status || "submitted"))
  );

  if (pendingInvoices.length > 0) {
    const totalPending = pendingInvoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
    alerts.push({
      title: "Invoices awaiting review",
      message: `${pendingInvoices.length} invoice(s) need office action worth £${totalPending.toFixed(2)}.`,
      audience: "admin",
      level: "warning",
    });
  }

  const approvedInvoices = invoices.filter((invoice) => String(invoice.office_status || "") === "approved");

  if (approvedInvoices.length > 0) {
    const totalApproved = approvedInvoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
    alerts.push({
      title: "Approved invoices pending payment",
      message: `${approvedInvoices.length} approved invoice(s) are ready to be paid worth £${totalApproved.toFixed(2)}.`,
      audience: "admin",
      level: "success",
    });
  }

  return alerts;
}
