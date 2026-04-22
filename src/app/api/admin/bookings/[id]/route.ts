import { NextRequest, NextResponse } from "next/server";
import { getBooking, getDriverById, getOfficeNotificationEmailSetting, requireAuthorizedUser, updateBooking } from "@/lib/supabase-admin";
import {
  buildGreeterAssignmentEmail,
  buildPassengerGreeterAssignmentEmail,
  canSendTransactionalEmail,
  getOfficeNotificationRecipients,
  sendTransactionalEmail,
} from "@/lib/email";

function formatServiceType(serviceType: string) {
  return String(serviceType || "Booking")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (value) => value.toUpperCase())
    .trim();
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuthorizedUser(request.headers.get("authorization"), ["admin"]);
    const body = await request.json();
    const previous = await getBooking(params.id);
    const updatePayload = { ...body };
    const overrideReason = String(updatePayload.assignment_override_reason || "").trim();
    delete updatePayload.assignment_override_reason;

    const assigningGreeter = Boolean(
      String(updatePayload.driver_id || "").trim() && String(updatePayload.driver_status || "").toLowerCase() === "assigned"
    );

    if (assigningGreeter) {
      const serviceTime = new Date(String(previous?.date_time || updatePayload.date_time || "")).getTime();
      const now = Date.now();
      const msUntilService = serviceTime - now;
      const within24Hours = Number.isFinite(serviceTime) && msUntilService > 0 && msUntilService <= 24 * 60 * 60 * 1000;

      if (within24Hours && !overrideReason) {
        return NextResponse.json(
          {
            error: "This booking is within 24 hours of service time. Provide an override reason to assign a greeter.",
            code: "ASSIGNMENT_OVERRIDE_REQUIRED",
          },
          { status: 409 }
        );
      }

      if (within24Hours && overrideReason) {
        const existingNotes = String(previous?.dispatch_notes || updatePayload.dispatch_notes || "").trim();
        const stampedNote = `[${new Date().toISOString()}] Late assignment override: ${overrideReason}`;
        updatePayload.dispatch_notes = existingNotes ? `${existingNotes}\n${stampedNote}` : stampedNote;
      }
    }

    const updated = await updateBooking(params.id, updatePayload);

    const previousDriverId = String(previous?.driver_id || "").trim();
    const assignedDriverId = String(updated?.driver_id || updatePayload?.driver_id || "").trim();
    const shouldNotifyAssignment = Boolean(assignedDriverId && assignedDriverId !== previousDriverId);

    if (shouldNotifyAssignment && canSendTransactionalEmail()) {
      try {
        const driver = await getDriverById(assignedDriverId);
        if (driver) {
          const storedOfficeEmail = await getOfficeNotificationEmailSetting();
          const officeRecipients = getOfficeNotificationRecipients({ bookingNotificationEmail: storedOfficeEmail ?? undefined });
          const supportEmail = officeRecipients[0];

          const assignmentInput = {
            bookingRef: String(updated.booking_ref || updated.id || params.id),
            passengerName: String(updated.full_name || "Passenger"),
            passengerEmail: String(updated.email || ""),
            serviceType: formatServiceType(String(updated.service_type || updated.serviceType || "Booking")),
            dateTime: String(updated.date_time || updated.dateTime || new Date().toISOString()),
            pickupLocation: String(updated.pickup_location || updated.pickupLocation || "TBC"),
            dropoffLocation: String(updated.dropoff_location || updated.dropoffLocation || ""),
            greeterName: String(driver.full_name || driver.name || "Assigned greeter"),
            greeterEmail: String(driver.email || ""),
            greeterPhone: String(driver.phone || ""),
            supportEmail,
          };

          const passengerEmail = buildPassengerGreeterAssignmentEmail(assignmentInput);
          const greeterEmail = buildGreeterAssignmentEmail(assignmentInput);

          const deliveries = [
            assignmentInput.passengerEmail
              ? sendTransactionalEmail({
                  to: assignmentInput.passengerEmail,
                  subject: passengerEmail.subject,
                  text: passengerEmail.text,
                  html: passengerEmail.html,
                })
              : Promise.resolve(null),
            assignmentInput.greeterEmail
              ? sendTransactionalEmail({
                  to: assignmentInput.greeterEmail,
                  subject: greeterEmail.subject,
                  text: greeterEmail.text,
                  html: greeterEmail.html,
                })
              : Promise.resolve(null),
          ];

          const results = await Promise.allSettled(deliveries);
          results.forEach((result) => {
            if (result.status === "rejected") {
              console.error("Assignment email delivery failed:", result.reason);
            }
          });
        }
      } catch (notificationError) {
        console.error("Assignment notification processing failed:", notificationError);
      }
    }

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update booking";
    const status = message === "Forbidden" ? 403 : message.includes("authorization") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
