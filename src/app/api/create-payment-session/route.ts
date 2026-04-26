import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getBaseUrl } from "@/lib/url";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export async function POST(request: Request) {
  try {
    const { bookingId, amount, bookingRef } = await request.json();
    const baseUrl = getBaseUrl(request);

    // Create a Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: `Booking ${bookingRef}`,
              description: "Chauffeur Service Booking",
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${baseUrl}/user/bookings/${bookingId}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/user/dashboard`,
      metadata: {
        bookingId,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error creating payment session:", error);
    return NextResponse.json(
      { error: "Failed to create payment session" },
      { status: 500 }
    );
  }
} 
