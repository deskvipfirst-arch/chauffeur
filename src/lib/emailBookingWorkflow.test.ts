import { describe, expect, it } from "vitest";
import { buildBookingConfirmationEmail, buildOfficeBookingNotificationEmail } from "./email";

describe("booking email workflow", () => {
  it("creates a customer confirmation email with the key booking details", () => {
    const result = buildBookingConfirmationEmail({
      fullName: "Alex Taylor",
      email: "alex@example.com",
      bookingRef: "CHAUF-20260418-TEST01",
      serviceType: "Airport Transfer",
      dateTime: "2026-04-20T09:30:00.000Z",
      pickupLocation: "Heathrow Airport Terminal 5",
      dropoffLocation: "Canary Wharf",
      amount: 245,
    });

    expect(result.subject).toContain("CHAUF-20260418-TEST01");
    expect(result.html).toContain("Alex Taylor");
    expect(result.html).toContain("Airport Transfer");
    expect(result.html).toContain("£245.00");
  });

  it("creates an office notification email for a paid booking", () => {
    const result = buildOfficeBookingNotificationEmail({
      fullName: "Alex Taylor",
      email: "alex@example.com",
      bookingRef: "CHAUF-20260418-TEST01",
      serviceType: "Airport Transfer",
      dateTime: "2026-04-20T09:30:00.000Z",
      pickupLocation: "Heathrow Airport Terminal 5",
      dropoffLocation: "Canary Wharf",
      amount: 245,
    });

    expect(result.subject).toContain("Office action needed");
    expect(result.html).toContain("alex@example.com");
    expect(result.html).toContain("VIP Greeters");
  });
});
