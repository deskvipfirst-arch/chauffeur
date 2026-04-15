"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Booking } from "@/types/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { loadStripe } from "@stripe/stripe-js";

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function PaymentPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const bookingDoc = await getDoc(doc(db, "bookings", params.id));
        if (bookingDoc.exists()) {
          setBooking(bookingDoc.data() as Booking);
        } else {
          toast.error("Booking not found");
          router.push("/user/dashboard");
        }
      } catch (error) {
        console.error("Error fetching booking:", error);
        toast.error("Failed to fetch booking details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBooking();
  }, [params.id, router]);

  const handlePayment = async () => {
    if (!booking) return;
    setIsProcessing(true);

    try {
      // Create a payment session
      const response = await fetch("/api/create-payment-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId: booking.id,
          amount: booking.amount,
          bookingRef: booking.booking_ref,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create payment session");
      }

      const { sessionId } = await response.json();
      const stripe = await stripePromise;

      if (!stripe) {
        throw new Error("Stripe failed to initialize");
      }

      // Redirect to Stripe Checkout
      const { error } = await stripe.redirectToCheckout({
        sessionId,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Failed to process payment. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (!booking) return <div>Booking not found</div>;

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-lg mb-2">Booking Information</h3>
                <p className="text-sm text-gray-600">Booking Reference: {booking.booking_ref}</p>
                <p className="text-sm text-gray-600">Date: {new Date(booking.date_time).toLocaleString()}</p>
                <p className="text-sm text-gray-600">Service Type: {booking.service_type}</p>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Payment Summary</h3>
                <p className="text-sm text-gray-600">Total Amount: £{booking.amount.toFixed(2)}</p>
                <p className="text-sm text-gray-600">Payment Status: {booking.payment_status || 'Unpaid'}</p>
              </div>
            </div>
            <div className="flex justify-end space-x-4">
              <Button
                variant="outline"
                onClick={() => router.push("/user/dashboard")}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePayment}
                disabled={isProcessing}
              >
                {isProcessing ? "Processing..." : "Pay Now"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 