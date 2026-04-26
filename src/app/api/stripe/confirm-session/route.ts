import { NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "@/lib/supabase/admin";
import {
  getPaymentSyncErrorMessage,
  isLegacyBookingStatusConstraintError,
  isStripeSessionPaid,
} from "@/lib/stripePaymentStatus";
import {
  buildBookingConfirmationEmail,
  buildOfficeBookingNotificationEmail,
  canSendTransactionalEmail,
  getOfficeNotificationRecipients,
  sendTransactionalEmail,
} from "@/lib/email";
import { getOfficeNotificationEmailSetting } from "@/lib/supabase/admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json();

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session ID" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(String(sessionId));

    let querySnapshot = await adminDb
      .collection("bookings")
      .where("stripe_session_id", "==", session.id)
      .get();

    if (querySnapshot.empty && session.metadata?.bookingId) {
      querySnapshot = await adminDb
        .collection("bookings")
        .where("id", "==", session.metadata.bookingId)
        .get();

      if (!querySnapshot.empty) {
        await adminDb.collection("bookings").doc(querySnapshot.docs[0].id).update({
          stripe_session_id: session.id,
        });
      }
    }

    if (querySnapshot.empty) {
      return NextResponse.json(
        {
          ok: false,
          paymentStatus: session.payment_status,
          status: session.status,
          message: "Booking not found for this payment session.",
        },
        { status: 404 }
      );
    }

    const bookingDoc = querySnapshot.docs[0];
    const bookingData = bookingDoc.data?.() || {};
    const alreadyPaid = String(bookingData.payment_status || "").toLowerCase() === "paid";
    const isPaid = isStripeSessionPaid(session);
    let statusPromoted = false;

    if (isPaid) {
      const paymentUpdate = {
        payment_status: "Paid",
        stripe_session_id: session.id,
      };

      try {
        await adminDb.collection("bookings").doc(bookingDoc.id).update({
          ...paymentUpdate,
          status: "confirmed",
        });
        statusPromoted = true;
      } catch (error) {
        if (!isLegacyBookingStatusConstraintError(error)) {
          throw error;
        }

        await adminDb.collection("bookings").doc(bookingDoc.id).update(paymentUpdate);
      }
    }

    if (isPaid && !alreadyPaid && canSendTransactionalEmail()) {
      const storedOfficeEmail = await getOfficeNotificationEmailSetting();
      const officeRecipients = getOfficeNotificationRecipients({ bookingNotificationEmail: storedOfficeEmail ?? undefined });
      const serviceType = String(bookingData.service_type || bookingData.serviceType || "Booking")
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (value) => value.toUpperCase())
        .trim();

      const customerEmail = buildBookingConfirmationEmail({
        fullName: String(bookingData.full_name || bookingData.fullName || session.customer_details?.name || "Customer"),
        email: String(bookingData.email || session.customer_details?.email || ""),
        bookingRef: String(bookingData.booking_ref || bookingDoc.id),
        serviceType,
        dateTime: String(bookingData.date_time || bookingData.dateTime || new Date().toISOString()),
        pickupLocation: String(bookingData.pickup_location || bookingData.pickupLocation || "TBC"),
        dropoffLocation: String(bookingData.dropoff_location || bookingData.dropoffLocation || ""),
        amount: Number(bookingData.amount || (session.amount_total || 0) / 100 || 0),
      });

      const officeEmail = buildOfficeBookingNotificationEmail({
        fullName: String(bookingData.full_name || bookingData.fullName || session.customer_details?.name || "Customer"),
        email: String(bookingData.email || session.customer_details?.email || ""),
        bookingRef: String(bookingData.booking_ref || bookingDoc.id),
        serviceType,
        dateTime: String(bookingData.date_time || bookingData.dateTime || new Date().toISOString()),
        pickupLocation: String(bookingData.pickup_location || bookingData.pickupLocation || "TBC"),
        dropoffLocation: String(bookingData.dropoff_location || bookingData.dropoffLocation || ""),
        amount: Number(bookingData.amount || (session.amount_total || 0) / 100 || 0),
        supportEmail: officeRecipients[0],
      });

      const deliveries = [
        customerEmail && (bookingData.email || session.customer_details?.email)
          ? sendTransactionalEmail({
              to: String(bookingData.email || session.customer_details?.email || ""),
              subject: customerEmail.subject,
              text: customerEmail.text,
              html: customerEmail.html,
            })
          : Promise.resolve(null),
        officeRecipients.length > 0
          ? sendTransactionalEmail({
              to: officeRecipients,
              subject: officeEmail.subject,
              text: officeEmail.text,
              html: officeEmail.html,
            })
          : Promise.resolve(null),
      ];

      const results = await Promise.allSettled(deliveries);
      results.forEach((result) => {
        if (result.status === "rejected") {
          console.error("Booking email delivery failed:", result.reason);
        }
      });
    }

    const hasDashboard = Boolean(bookingData.user_id);

    return NextResponse.json({
      ok: true,
      bookingId: bookingDoc.id,
      paymentStatus: session.payment_status,
      status: session.status,
      confirmed: isPaid,
      statusPromoted,
      hasDashboard,
      bookingRef: String(bookingData.booking_ref || ""),
    });
  } catch (error) {
    const message = getPaymentSyncErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
