export const runtime = "nodejs";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "@/lib/supabase/admin";
import {
  buildBookingConfirmationEmail,
  buildOfficeBookingNotificationEmail,
  canSendTransactionalEmail,
  getOfficeNotificationRecipients,
  sendTransactionalEmail,
} from "@/lib/email";
import {
  getPaymentSyncErrorMessage,
  isLegacyBookingStatusConstraintError,
  isStripeSessionPaid,
} from "@/lib/stripePaymentStatus";
import { getOfficeNotificationEmailSetting } from "@/lib/supabase/admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe signature" },
        { status: 400 }
      );
    }

    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      if (!session.id) {
        return NextResponse.json(
          { error: "Missing session ID" },
          { status: 400 }
        );
      }

      // Query for the booking with this session ID
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
          { error: "No booking found for this session" },
          { status: 404 }
        );
      }

      // Update the booking status
      const bookingDoc = querySnapshot.docs[0];
      const bookingData = bookingDoc.data?.() || {};
      const alreadyPaid = String(bookingData.payment_status || "").toLowerCase() === "paid";
      const sessionPaid = isStripeSessionPaid(session);

      if (sessionPaid) {
        const paymentUpdate = {
          payment_status: "Paid",
          stripe_session_id: session.id,
        };

        try {
          await adminDb.collection("bookings").doc(bookingDoc.id).update({
            ...paymentUpdate,
            status: "confirmed",
          });
        } catch (error) {
          if (!isLegacyBookingStatusConstraintError(error)) {
            throw error;
          }

          await adminDb.collection("bookings").doc(bookingDoc.id).update(paymentUpdate);
        }
      }

      if (!sessionPaid) {
        return NextResponse.json({ received: true, paymentStatus: session.payment_status });
      }

      if (!alreadyPaid && canSendTransactionalEmail()) {
        const serviceType = String(bookingData.service_type || bookingData.serviceType || "Booking")
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (value) => value.toUpperCase())
          .trim();

        const storedOfficeEmail = await getOfficeNotificationEmailSetting();
        const officeRecipients = getOfficeNotificationRecipients({ bookingNotificationEmail: storedOfficeEmail ?? undefined });

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

      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    const message = getPaymentSyncErrorMessage(err);
    return NextResponse.json({ error: message || "Webhook error" }, { status: 400 });
  }
}
