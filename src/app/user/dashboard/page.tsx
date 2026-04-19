"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, isAfter, subHours } from "date-fns";
import { toast } from "sonner";
import { auth, db } from "@/lib/supabase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "@/lib/supabase-db";
import { onAuthStateChanged } from "@/lib/supabase-auth";
import { getUserDisplayName, getUserFirstName, getUserInitials } from "@/lib/userDisplay";
import type { Booking } from "@/types/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowRight,
  Calendar,
  CreditCard,
  Loader2,
  MapPin,
  Plane,
  Plus,
  Trash2,
  User,
} from "lucide-react";

const formatServiceType = (type: string): string => {
  return type
    .split(/(?=[A-Z])|_/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return format(date, "EEEE, MMMM d, yyyy 'at' h:mm a");
};

const formatStatusLabel = (value?: string | null) => {
  return String(value || "pending")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const isPaidBooking = (booking: Booking) => String(booking.payment_status || "").toLowerCase() === "paid";
const isCancelledBooking = (booking: Booking) => String(booking.status || "").toLowerCase() === "cancelled";
const isDeletedBooking = (booking: Booking) => String(booking.status || "").toLowerCase() === "deleted";

const canModifyBooking = (bookingDate: string) => {
  const serviceDateTime = new Date(bookingDate);
  const cutoff = subHours(serviceDateTime, 24);
  return isAfter(cutoff, new Date());
};

function getStatusBadge(booking: Booking) {
  if (isCancelledBooking(booking)) {
    return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100">Cancelled</Badge>;
  }

  if (!isPaidBooking(booking)) {
    return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Payment pending</Badge>;
  }

  if (String(booking.status || "").toLowerCase() === "completed") {
    return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Completed</Badge>;
  }

  return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">{formatStatusLabel(booking.status || "confirmed")}</Badge>;
}

export default function CustomerDashboard() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingPayments, setProcessingPayments] = useState<Record<string, boolean>>({});
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);

      if (!nextUser) {
        setUserProfile(null);
        setBookings([]);
        setIsLoading(false);
        router.push("/user/signin");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const bookingsRef = collection(db, "bookings");
        const bookingsQuery = query(
          bookingsRef,
          where("user_id", "==", nextUser.uid),
          orderBy("date_time", "desc")
        );

        const [profileDoc, querySnapshot] = await Promise.all([
          getDoc(doc(db, "profiles", nextUser.uid)),
          getDocs(bookingsQuery),
        ]);

        const fallbackDisplayName = getUserDisplayName(null, nextUser);
        const parts = fallbackDisplayName.split(/\s+/).filter(Boolean);
        const fallbackProfile = {
          firstName: getUserFirstName(null, nextUser),
          lastName: parts.slice(1).join(" "),
          email: nextUser.email || "",
          phone: "",
          role: "user",
        };

        if (profileDoc.exists()) {
          setUserProfile({ ...fallbackProfile, ...profileDoc.data() });
        } else {
          setUserProfile(fallbackProfile);
          try {
            await setDoc(doc(db, "profiles", nextUser.uid), fallbackProfile);
          } catch (profileError) {
            console.warn("Profile bootstrap warning:", profileError);
          }
        }

        const bookingsData = querySnapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        })) as Booking[];

        setBookings(bookingsData);
      } catch (err) {
        console.error("Error fetching passenger dashboard data:", err);
        setError("We could not load your dashboard just now. Please try again shortly.");
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleCancelBooking = async (booking: Booking) => {
    try {
      await updateDoc(doc(db, "bookings", booking.id), {
        status: "cancelled",
      });

      setBookings((current) =>
        current.map((item) => (item.id === booking.id ? { ...item, status: "cancelled" } : item))
      );
      toast.success("Booking cancelled successfully.");
      setBookingToCancel(null);
    } catch (err) {
      console.error("Error cancelling booking:", err);
      setError("Failed to cancel booking. Please try again.");
      toast.error("Failed to cancel booking. Please try again.");
    }
  };

  const handleDeleteBooking = async (booking: Booking) => {
    try {
      await updateDoc(doc(db, "bookings", booking.id), {
        status: "deleted",
      });

      setBookings((current) => current.filter((item) => item.id !== booking.id));
      setBookingToDelete(null);
      toast.success("Booking removed from your history.");
    } catch (err) {
      console.error("Error deleting booking:", err);
      toast.error("Failed to delete booking. Please try again.");
    }
  };

  const handlePayment = async (booking: Booking) => {
    try {
      setProcessingPayments((current) => ({ ...current, [booking.id]: true }));

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

      const { url } = await response.json();
      if (!url) {
        throw new Error("No checkout URL received");
      }

      window.location.href = url;
    } catch (paymentError) {
      console.error("Payment error:", paymentError);
      toast.error("Failed to process payment. Please try again.");
      setProcessingPayments((current) => ({ ...current, [booking.id]: false }));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted p-6">
        <div className="container mx-auto flex min-h-[50vh] items-center justify-center">
          <div className="flex items-center gap-3 text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading your journeys...</span>
          </div>
        </div>
      </div>
    );
  }

  const now = new Date();
  const visibleBookings = bookings.filter((booking) => !isDeletedBooking(booking));
  const upcomingBookings = visibleBookings.filter((booking) => new Date(booking.date_time) > now && !isCancelledBooking(booking));
  const historyBookings = visibleBookings.filter((booking) => new Date(booking.date_time) <= now || isCancelledBooking(booking));
  const pendingPayments = visibleBookings.filter((booking) => !isCancelledBooking(booking) && !isPaidBooking(booking));
  const displayName = getUserDisplayName(userProfile, user);
  const firstName = getUserFirstName(userProfile, user);
  const initials = getUserInitials(userProfile, user);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <AlertDialog open={!!bookingToCancel} onOpenChange={() => setBookingToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel booking</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the journey as cancelled. You can still keep a record of it in your history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep booking</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bookingToCancel && handleCancelBooking(bookingToCancel)}
              className="bg-red-600 hover:bg-red-700"
            >
              Cancel booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!bookingToDelete} onOpenChange={() => setBookingToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete booking record</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the journey from your dashboard history view.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bookingToDelete && handleDeleteBooking(bookingToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={Object.values(processingPayments).some(Boolean)} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Redirecting to payment</DialogTitle>
            <DialogDescription>
              Please wait while we prepare your secure checkout page.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>

      <div className="container mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-sm font-semibold">
                  {initials}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-amber-300">Passenger dashboard</p>
                  <h1 className="text-3xl font-semibold sm:text-4xl">Hello {firstName}!</h1>
                </div>
              </div>
              <p className="max-w-2xl text-sm text-slate-200 sm:text-base">
                Track upcoming journeys, complete outstanding payments, and manage your passenger details in one place.
              </p>
              <p className="text-sm text-slate-300">Signed in as {displayName}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild variant="secondary">
                <Link href="/booking">
                  <Plus className="h-4 w-4" />
                  Book a journey
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white">
                <Link href="/user/profile">
                  <User className="h-4 w-4" />
                  Profile settings
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription>Upcoming journeys</CardDescription>
              <CardTitle className="text-3xl">{upcomingBookings.length}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              Your next confirmed and pending trips appear here.
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription>Awaiting payment</CardDescription>
              <CardTitle className="text-3xl">{pendingPayments.length}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              Complete payment to lock in any unpaid journeys.
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription>Journey history</CardDescription>
              <CardTitle className="text-3xl">{historyBookings.length}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              Review completed, cancelled, or older trips anytime.
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Upcoming bookings</CardTitle>
              <CardDescription>Bookings can usually be edited or cancelled up to 24 hours before service.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingBookings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                  <p className="text-base font-medium text-slate-900">No upcoming journeys yet</p>
                  <p className="mt-1 text-sm text-slate-600">When you place a booking, it will appear here with payment and trip updates.</p>
                  <Button asChild className="mt-4">
                    <Link href="/booking">Start a new booking</Link>
                  </Button>
                </div>
              ) : (
                upcomingBookings.map((booking) => {
                  const modificationOpen = canModifyBooking(booking.date_time);
                  const paymentPending = !isPaidBooking(booking);
                  const showEdit = modificationOpen && !paymentPending;

                  return (
                    <div key={booking.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {getStatusBadge(booking)}
                            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                              {booking.booking_ref || "Reference pending"}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">
                              {formatServiceType(booking.service_type)}
                            </h3>
                            <p className="text-sm text-slate-600">
                              {booking.service_subtype ? `${formatStatusLabel(booking.service_subtype)} service` : "Private transfer"}
                            </p>
                          </div>

                          <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                            <div className="flex items-start gap-2">
                              <Calendar className="mt-0.5 h-4 w-4 text-slate-400" />
                              <span>{formatDate(booking.date_time)}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <CreditCard className="mt-0.5 h-4 w-4 text-slate-400" />
                              <span>£{Number(booking.amount || 0).toFixed(2)} • {paymentPending ? "Unpaid" : "Paid"}</span>
                            </div>
                            <div className="flex items-start gap-2 sm:col-span-2">
                              <MapPin className="mt-0.5 h-4 w-4 text-slate-400" />
                              <span>
                                {booking.pickup_location}
                                {booking.dropoff_location ? ` → ${booking.dropoff_location}` : ""}
                              </span>
                            </div>
                            {(booking.arrival_flight || booking.departure_flight || booking.flight_number_arrival || booking.flight_number_departure) && (
                              <div className="flex items-start gap-2 sm:col-span-2">
                                <Plane className="mt-0.5 h-4 w-4 text-slate-400" />
                                <span>
                                  {booking.arrival_flight || booking.flight_number_arrival || booking.departure_flight || booking.flight_number_departure}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 lg:max-w-[230px] lg:justify-end">
                          {paymentPending ? (
                            <Button onClick={() => handlePayment(booking)} disabled={processingPayments[booking.id]}>
                              {processingPayments[booking.id] ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Processing
                                </>
                              ) : (
                                <>
                                  <CreditCard className="h-4 w-4" />
                                  Complete payment
                                </>
                              )}
                            </Button>
                          ) : null}

                          {showEdit ? (
                            <Button asChild variant="outline">
                              <Link href={`/user/bookings/${booking.id}/edit`}>
                                Edit details
                              </Link>
                            </Button>
                          ) : null}

                          {modificationOpen ? (
                            <Button variant="ghost" onClick={() => setBookingToCancel(booking)}>
                              Cancel booking
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-500">Changes close 24 hours before pickup.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Quick actions</CardTitle>
                <CardDescription>Common passenger tasks in one place.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button asChild className="w-full justify-between">
                  <Link href="/booking">
                    Book another journey
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-between">
                  <Link href="/user/profile">
                    Update profile
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-between">
                  <Link href="/contact">
                    Contact support
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Passenger tips</CardTitle>
                <CardDescription>Useful reminders before you travel.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <p>• Keep your phone number up to date so the office can contact you if needed.</p>
                <p>• Unpaid bookings can be completed directly from the dashboard.</p>
                <p>• Flight details and route notes appear inside each journey card for faster review.</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Booking history</CardTitle>
            <CardDescription>Your completed, cancelled, or older bookings are listed below.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {historyBookings.length === 0 ? (
              <p className="text-sm text-slate-600">No past or cancelled journeys yet.</p>
            ) : (
              historyBookings.map((booking) => (
                <div key={booking.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {getStatusBadge(booking)}
                        <span className="text-xs uppercase tracking-wide text-slate-500">
                          {booking.booking_ref || "Reference pending"}
                        </span>
                      </div>
                      <p className="font-semibold text-slate-900">{formatServiceType(booking.service_type)}</p>
                      <p className="text-sm text-slate-600">{formatDate(booking.date_time)}</p>
                      <p className="text-sm text-slate-600">
                        {booking.pickup_location}
                        {booking.dropoff_location ? ` → ${booking.dropoff_location}` : ""}
                      </p>
                      <p className="text-sm text-slate-600">£{Number(booking.amount || 0).toFixed(2)} • {isPaidBooking(booking) ? "Paid" : "Unpaid"}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button variant="destructive" size="sm" onClick={() => setBookingToDelete(booking)}>
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
