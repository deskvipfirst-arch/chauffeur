import { NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "@/lib/supabase-admin";
import {
  getPaymentSyncErrorMessage,
  isLegacyBookingStatusConstraintError,
  isStripeSessionPaid,
} from "@/lib/stripePaymentStatus";

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

    return NextResponse.json({
      ok: true,
      bookingId: bookingDoc.id,
      paymentStatus: session.payment_status,
      status: session.status,
      confirmed: isPaid,
      statusPromoted,
    });
  } catch (error) {
    const message = getPaymentSyncErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
