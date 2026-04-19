"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle } from "lucide-react";

export default function PaymentSuccessPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const updateBookingStatus = async () => {
      const sessionId = searchParams.get("session_id");
      if (!sessionId) {
        toast.error("Invalid payment session");
        router.push("/user/dashboard");
        return;
      }

      try {
        const response = await fetch("/api/stripe/confirm-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.error || result?.message || "Failed to confirm payment session");
        }

        toast.success(result?.confirmed ? "Payment confirmed." : "Payment is still processing.");
      } catch (error) {
        console.error("Error updating booking:", error);
        toast.error("Failed to update booking status");
      } finally {
        setIsProcessing(false);
      }
    };

    updateBookingStatus();
  }, [params.id, router, searchParams]);

  if (isProcessing) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <p>Processing payment...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            Payment Processing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <p className="text-gray-600">
              Your payment is being processed. Please check your dashboard for the updated status.
            </p>
            <div className="flex justify-end">
              <Button onClick={() => router.push("/user/dashboard")}>
                Return to Dashboard
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 