"use client";

import { Suspense, useEffect, useState } from "react";
import { CheckCircle, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
          <div className="relative mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6 py-16">
            <div className="w-full rounded-3xl border border-white/10 bg-white/10 p-8 text-center shadow-2xl backdrop-blur-md md:p-10">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-emerald-300" />
              <p className="mt-4 text-slate-200">Loading your booking confirmation...</p>
            </div>
          </div>
        </div>
      }
    >
      <SuccessPageContent />
    </Suspense>
  );
}

function SuccessPageContent() {
  const searchParams = useSearchParams();
  const [isChecking, setIsChecking] = useState(true);
  const [statusMessage, setStatusMessage] = useState("We are confirming your payment and updating your booking.");
  const [hasDashboard, setHasDashboard] = useState(false);
  const [bookingRef, setBookingRef] = useState("");

  useEffect(() => {
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      setStatusMessage("Your booking page loaded, but the payment session could not be verified.");
      setIsChecking(false);
      return;
    }

    const confirmSession = async () => {
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
          throw new Error(result?.error || result?.message || "Could not confirm payment.");
        }

        const bookingHasDashboard = Boolean(result?.hasDashboard);
        setHasDashboard(bookingHasDashboard);
        setBookingRef(String(result?.bookingRef || ""));
        setStatusMessage(
          result?.confirmed
            ? bookingHasDashboard
              ? "Your payment has been confirmed. Our booking team will confirm your booking and assign a greeter at least 24 hours before service time."
              : "Your payment has been confirmed. Our booking team will confirm your booking and assign a greeter at least 24 hours before service time."
            : bookingHasDashboard
              ? "Your payment is still processing. Please check your dashboard again shortly."
              : "Your payment is still processing. Please keep this page and check your email for updates shortly."
        );
      } catch (error) {
        console.error("Error confirming payment session:", error);
        setStatusMessage("We could not verify the payment automatically just yet. Please keep your confirmation page and contact support if needed.");
      } finally {
        setIsChecking(false);
      }
    };

    void confirmSession();
  }, [searchParams]);

  return <SuccessPageShell isChecking={isChecking} statusMessage={statusMessage} hasDashboard={hasDashboard} bookingRef={bookingRef} />;
}

function SuccessPageShell({
  isChecking,
  statusMessage,
  hasDashboard,
  bookingRef,
}: {
  isChecking: boolean;
  statusMessage: string;
  hasDashboard: boolean;
  bookingRef: string;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{ backgroundImage: "url('/images/special-events.jpg.jpg')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900/95 to-emerald-950/80" />

      <div className="relative mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full rounded-3xl border border-white/10 bg-white/10 p-8 text-center shadow-2xl backdrop-blur-md md:p-10"
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15">
            {isChecking ? (
              <Loader2 className="h-10 w-10 animate-spin text-emerald-300" />
            ) : (
              <CheckCircle className="h-10 w-10 text-emerald-400" />
            )}
          </div>

          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">
            VIP Greeters
          </p>
          <h1 className="mb-4 text-3xl font-bold md:text-5xl">
            {isChecking ? "Confirming your booking" : "Booking success"}
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-base leading-7 text-slate-200 md:text-lg">
            {statusMessage}
          </p>

          <div className="mb-8 grid gap-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-left md:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Status</p>
              <p className="mt-1 font-medium text-white">{isChecking ? "Checking" : "Updated"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Next step</p>
              <p className="mt-1 font-medium text-white">{hasDashboard ? "Booking team review and greeter assignment" : "Booking team review and greeter assignment"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Support</p>
              <p className="mt-1 font-medium text-white">Email confirmation in progress</p>
            </div>
          </div>

          {!isChecking && bookingRef ? (
            <div className="mb-8 rounded-2xl border border-emerald-300/25 bg-emerald-500/10 p-4 text-left">
              <p className="text-xs uppercase tracking-wide text-emerald-200">Booking reference</p>
              <p className="mt-1 text-lg font-semibold text-white">{bookingRef}</p>
              <p className="mt-2 text-sm text-emerald-100">
                A confirmation email with this reference is being sent. It confirms payment and explains when your greeter assignment will be shared.
              </p>
            </div>
          ) : null}

          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            {hasDashboard ? (
              <Link
                href="/user/dashboard"
                className="inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
                Return to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            ) : (
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
                Return to Home
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            )}
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-2xl border border-white/15 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              Contact office
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
