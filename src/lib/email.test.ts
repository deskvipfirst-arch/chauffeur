import { describe, expect, it } from "vitest";
import {
  buildBookingConfirmationEmail,
  buildContactNotificationEmail,
  canSendTransactionalEmail,
} from "./email";

describe("email helpers", () => {
  it("builds a booking confirmation email payload", () => {
    const message = buildBookingConfirmationEmail({
      fullName: "Jane Smith",
      email: "jane@example.com",
      bookingRef: "CHAUF-20260418-ABC123",
      serviceType: "Meet and Greet",
      dateTime: "2026-04-19T14:00:00.000Z",
      pickupLocation: "Heathrow Airport Terminal 2",
      dropoffLocation: "Central London",
      amount: 180,
    });

    expect(message.subject).toContain("CHAUF-20260418-ABC123");
    expect(message.html).toContain("Jane Smith");
    expect(message.html).toContain("Heathrow Airport Terminal 2");
    expect(message.html).toContain("VIP Greeters");
    expect(message.html).toContain("Amount paid");
  });

  it("builds a contact notification email payload", () => {
    const message = buildContactNotificationEmail({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phone: "07123456789",
      subject: "Airport pickup",
      message: "Please confirm availability.",
    });

    expect(message.subject).toContain("Airport pickup");
    expect(message.text).toContain("Please confirm availability.");
    expect(message.html).toContain("VIP Greeters");
    expect(message.html).toContain("New contact enquiry");
  });

  it("reports email sending readiness only when required settings exist", () => {
    expect(canSendTransactionalEmail({ apiKey: "", fromEmail: "ops@example.com" })).toBe(false);
    expect(canSendTransactionalEmail({ apiKey: "test_key", fromEmail: "ops@example.com" })).toBe(true);
  });
});
