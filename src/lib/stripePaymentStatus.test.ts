import { describe, expect, it } from "vitest";
import {
  getPaymentSyncErrorMessage,
  isLegacyBookingStatusConstraintError,
  isStripeSessionPaid,
} from "./stripePaymentStatus";

describe("isStripeSessionPaid", () => {
  it("returns true for paid sessions", () => {
    expect(isStripeSessionPaid({ payment_status: "paid", status: "complete" })).toBe(true);
  });

  it("returns true for no-payment-required sessions", () => {
    expect(isStripeSessionPaid({ payment_status: "no_payment_required", status: "complete" })).toBe(true);
  });

  it("returns false for unpaid sessions", () => {
    expect(isStripeSessionPaid({ payment_status: "unpaid", status: "open" })).toBe(false);
  });
});

describe("payment sync error helpers", () => {
  it("detects the legacy bookings status constraint error", () => {
    expect(
      isLegacyBookingStatusConstraintError({
        code: "23514",
        message: 'new row for relation "bookings" violates check constraint "bookings_status_check"',
      })
    ).toBe(true);
  });

  it("extracts a useful message from non-Error objects", () => {
    expect(getPaymentSyncErrorMessage({ message: "Schema mismatch" })).toBe("Schema mismatch");
  });
});
