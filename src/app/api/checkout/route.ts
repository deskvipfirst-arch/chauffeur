import Stripe from "stripe";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/supabase/admin";
import { getBaseUrl } from "@/lib/url";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function formatServiceType(serviceType: string): string {
  switch (serviceType) {
    case "meetAndGreet":
      return "Meet and Greet";
    case "airportTransfer":
      return "Airport Transfer";
    case "hourlyHire":
      return "Hourly Hire";
    default:
      return serviceType;
  }
}

function generateBookingRef() {
  // Example: CHAUF-YYYYMMDD-XXXXXX
  const date = new Date();
  const dateStr = date.toISOString().slice(0,10).replace(/-/g, '');
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `CHAUF-${dateStr}-${randomStr}`;
}

export async function POST(req: Request) {
  try {
    const { bookingDetails, amount, userId } = await req.json();

    // Validate environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const baseUrl = getBaseUrl(req);

    // Validate request body
    if (!bookingDetails?.fullName || !bookingDetails?.email || !bookingDetails?.pickupLocation || !bookingDetails?.dateTime || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid booking details" },
        { status: 400 }
      );
    }

    try {
      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "gbp",
              product_data: {
                name: `${formatServiceType(bookingDetails.service_type || bookingDetails.serviceType)} - ${
                  (bookingDetails.service_type === "hourlyHire" || bookingDetails.serviceType === "hourlyHire") ? "By the Hour" : bookingDetails.service_subtype
                }`,
                description: `Booking for ${bookingDetails.fullName}`,
              },
              unit_amount: Math.round(amount * 100),
            },
            quantity: 1,
          },
        ],
        metadata: {
          fullName: String(bookingDetails.fullName),
          email: String(bookingDetails.email),
          phone: String(bookingDetails.phone || "N/A"),
          pickup: String(bookingDetails.pickupLocation),
          dropoff: String(bookingDetails.dropoffLocation || "N/A"),
          additionalRequests: String(bookingDetails.additionalRequests || "None"),
          dateTime: String(bookingDetails.dateTime),
          serviceType: String(bookingDetails.serviceType),
          meetAndGreetType: String(bookingDetails.meetAndGreetType || "N/A"),
          isHourlyHire: String(bookingDetails.serviceType === "hourlyHire"),
          duration: bookingDetails.serviceType === "hourlyHire" ? String(bookingDetails.duration) : null,
          durationUnit: bookingDetails.serviceType === "hourlyHire" ? String(bookingDetails.durationUnit) : null,
          flightNumberArrival: String(bookingDetails.flightNumberArrival || "N/A"),
          flightNumberDeparture: String(bookingDetails.flightNumberDeparture || "N/A"),
        },
        customer_email: bookingDetails.email,
        success_url: `${baseUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/`,
        custom_text: {
          submit: {
            message: `Booking Summary:
Service: ${bookingDetails.serviceType}
Date: ${new Date(bookingDetails.dateTime).toLocaleDateString()}
Time: ${new Date(bookingDetails.dateTime).toLocaleTimeString()}
Pickup: ${bookingDetails.pickupLocation}
${bookingDetails.dropoffLocation ? `Dropoff: ${bookingDetails.dropoffLocation}` : ''}
Passengers: ${bookingDetails.passengers}
${bookingDetails.bags > 0 ? `Bags: ${bookingDetails.bags}` : ''}
${bookingDetails.wantBuggy ? 'Buggy Service: Yes' : ''}
${bookingDetails.wantPorter ? 'Porter Service: Yes' : ''}
${bookingDetails.flightNumberArrival ? `Arrival Flight: ${bookingDetails.flightNumberArrival}` : ''}
${bookingDetails.flightNumberDeparture ? `Departure Flight: ${bookingDetails.flightNumberDeparture}` : ''}`,
          },
        },
      });

      // Save booking to Supabase
      const bookingRef = generateBookingRef();
      const bookingData = {
        full_name: bookingDetails.fullName,
        email: bookingDetails.email,
        phone: bookingDetails.phone,
        pickup_location: bookingDetails.pickupLocation,
        dropoff_location: bookingDetails.dropoffLocation,
        date_time: bookingDetails.dateTime,
        service_type: bookingDetails.service_type,
        service_subtype: bookingDetails.service_subtype,
        duration: bookingDetails.duration,
        duration_unit: bookingDetails.durationUnit,
        additional_requests: bookingDetails.additionalRequests,
        flight_number_arrival: bookingDetails.flightNumberArrival,
        flight_number_departure: bookingDetails.flightNumberDeparture,
        passengers: bookingDetails.passengers,
        bags: bookingDetails.bags,
        want_buggy: bookingDetails.wantBuggy,
        want_porter: bookingDetails.wantPorter,
        contact_consent: bookingDetails.contactConsent,
        amount: amount,
        status: "pending",
        payment_status: "pending",
        created_at: new Date(),
        updated_at: new Date(),
        stripe_session_id: session.id,
        user_id: userId || null,
        booking_ref: bookingRef,
      };

      await adminDb.collection("bookings").add(bookingData);

      return NextResponse.json({ url: session.url });
    } catch (err) {
      const error = err as Error;
      return NextResponse.json(
        { error: error.message || "Failed to process booking" },
        { status: 500 }
      );
    }
  } catch (err) {
    const error = err as Error;
    return NextResponse.json(
      { error: error.message || "Failed to process request" },
      { status: 500 }
    );
  }
}
