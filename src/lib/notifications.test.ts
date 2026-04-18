import { describe, expect, it } from "vitest";
import {
  buildAssignmentNotification,
  buildGreeterStatusNotification,
  buildInvoiceSubmissionNotification,
  buildOperationsAlerts,
} from "./notifications";

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

  it("builds an invoice submission notification", () => {
    expect(buildInvoiceSubmissionNotification("CHAUF-123", 155)).toMatchObject({
      title: "Invoice submitted",
      audience: "admin",
      level: "warning",
    });
  });

  it("builds operational alerts for active jobs and pending invoices", () => {
    const alerts = buildOperationsAlerts({
      bookings: [
        { booking_ref: "CHAUF-1", driver_status: "accepted" },
        { booking_ref: "CHAUF-2", driver_status: "completed" },
      ],
      invoices: [
        { booking_ref: "CHAUF-1", office_status: "submitted", amount: 120 },
        { booking_ref: "CHAUF-2", office_status: "approved", amount: 200 },
      ],
    });

    expect(alerts).toHaveLength(3);
    expect(alerts[0].audience).toBe("admin");
  });
});
