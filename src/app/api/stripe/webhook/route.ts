export const runtime = 'nodejs';
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "@/lib/supabase-admin";

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
      const querySnapshot = await adminDb
        .collection("bookings")
        .where("stripe_session_id", "==", session.id)
        .get();

      if (querySnapshot.empty) {
        return NextResponse.json(
          { error: "No booking found for this session" },
          { status: 404 }
        );
      }

      // Update the booking status
      const bookingDoc = querySnapshot.docs[0];

      await adminDb.collection("bookings").doc(bookingDoc.id).update({
        status: "confirmed",
        payment_status: "Paid",
        updated_at: new Date()
      });

      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    const error = err as Error;
    return NextResponse.json(
      { error: error.message || "Webhook error" },
      { status: 400 }
    );
  }
}