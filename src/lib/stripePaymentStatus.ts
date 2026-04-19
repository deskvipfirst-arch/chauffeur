export function isStripeSessionPaid(session: {
  payment_status?: string | null;
  status?: string | null;
}) {
  const paymentStatus = String(session.payment_status || "").toLowerCase();
  return paymentStatus === "paid" || paymentStatus === "no_payment_required";
}

export function getPaymentSyncErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return "Failed to confirm payment session";
}

export function isLegacyBookingStatusConstraintError(error: unknown) {
  const code =
    typeof error === "object" && error && "code" in error
      ? String((error as { code?: unknown }).code || "")
      : "";
  const message = getPaymentSyncErrorMessage(error);

  return code === "23514" || /bookings_status_check/i.test(message);
}
