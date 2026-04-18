import { describe, expect, it } from "vitest";
import { buildBookingDraft, getSignupErrorMessage, splitFullName } from "./bookingFlow";

describe("booking flow helpers", () => {
  it("preserves contact details from the booking draft", () => {
    const draft = buildBookingDraft({
      service_type: "meetAndGreet",
      fullName: "Jane Smith",
      email: "jane@example.com",
      phone: "+44 7000 000000",
      pickupLocationId: "lhr-t2",
    });

    expect(draft.fullName).toBe("Jane Smith");
    expect(draft.email).toBe("jane@example.com");
    expect(draft.phone).toBe("+44 7000 000000");
    expect(draft.service_type).toBe("meetAndGreet");
  });

  it("uses a custom meet-up address when older drafts only store plain location text", () => {
    const draft = buildBookingDraft({
      meetUpLocation: "Heathrow Airport Terminal 2",
    });

    expect(draft.pickupLocationId).toBe("other");
    expect(draft.customPickupAddress).toBe("Heathrow Airport Terminal 2");
  });

  it("splits a single full name into signup fields", () => {
    expect(splitFullName("Jane Mary Smith")).toEqual({
      firstName: "Jane",
      lastName: "Mary Smith",
    });
  });

  it("maps session-missing signup errors to a user-friendly message", () => {
    expect(getSignupErrorMessage({ code: "auth/unknown", message: "Auth session missing!" })).toContain("account was created");
  });
});
