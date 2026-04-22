import { describe, expect, it } from "vitest";
import {
  buildBookingConfirmationEmail,
  buildGreeterAssignmentEmail,
  buildOfficeBookingNotificationEmail,
  buildPassengerGreeterAssignmentEmail,
} from "./email";

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

  it("creates a passenger assignment email with greeter details", () => {
    const result = buildPassengerGreeterAssignmentEmail({
      bookingRef: "CHAUF-20260418-TEST01",
      passengerName: "Alex Taylor",
      passengerEmail: "alex@example.com",
      serviceType: "Airport Transfer",
      dateTime: "2026-04-20T09:30:00.000Z",
      pickupLocation: "Heathrow Airport Terminal 5",
      dropoffLocation: "Canary Wharf",
      greeterName: "Jordan Lee",
      greeterEmail: "jordan@example.com",
      greeterPhone: "+44 7000 000000",
    });

    expect(result.subject).toContain("Greeter assigned");
    expect(result.html).toContain("Jordan Lee");
    expect(result.html).toContain("+44 7000 000000");
  });

  it("creates a greeter assignment email with passenger details", () => {
    const result = buildGreeterAssignmentEmail({
      bookingRef: "CHAUF-20260418-TEST01",
      passengerName: "Alex Taylor",
      passengerEmail: "alex@example.com",
      serviceType: "Airport Transfer",
      dateTime: "2026-04-20T09:30:00.000Z",
      pickupLocation: "Heathrow Airport Terminal 5",
      dropoffLocation: "Canary Wharf",
      greeterName: "Jordan Lee",
      greeterEmail: "jordan@example.com",
      greeterPhone: "+44 7000 000000",
    });

    expect(result.subject).toContain("New greeter assignment");
    expect(result.html).toContain("Alex Taylor");
    expect(result.html).toContain("CHAUF-20260418-TEST01");
  });
});
