"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { Booking } from "@/types/admin";
import { auth, db } from "@/lib/supabase";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  updateDoc,
} from "@/lib/supabase-db";
import { format, isAfter, subHours } from "date-fns";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Trash2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { onAuthStateChanged } from "@/lib/supabase-auth";


// Format service type for display
const formatServiceType = (type: string): string => {
  return type
    .split(/(?=[A-Z])|_/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Format date for display
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return format(date, "EEEE, MMMM d, yyyy 'at' h:mm a");
};

export default function CustomerDashboard() {
  const [user, setUser] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingPayments, setProcessingPayments] = useState<{ [key: string]: boolean }>({});
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (!user) {
        router.push("/user/signin");
        return;
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        const bookingsRef = collection(db, "bookings");
        const q = query(
          bookingsRef,
          where("user_id", "==", user.uid),
          orderBy("date_time", "desc")
        );

        const querySnapshot = await getDocs(q);
        const bookingsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Booking[];

        setBookings(bookingsData);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to fetch data. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  const handleCancelBooking = async (booking: Booking) => {
    try {
      const bookingRef = doc(db, "bookings", booking.id);
      // Instead of deleting, update the status to cancelled
      await updateDoc(bookingRef, {
        status: "cancelled",
        updated_at: new Date().toISOString(),
      });
      
      // Update local state - Fix the comparison to use the correct booking ID
      setBookings(bookings.map(b => 
        b.id === booking.id 
          ? { ...b, status: "cancelled" }
          : b
      ));
      
      toast.success("Booking cancelled successfully");
      setBookingToCancel(null);
    } catch (err) {
      console.error("Error cancelling booking:", err);
      toast.error("Failed to cancel booking. Please try again.");
      setError("Failed to cancel booking. Please try again.");
    }
  };

  const handleDeleteBooking = async (booking: Booking) => {
    try {
      if (!booking.id) return;
      
      const bookingRef = doc(db, "bookings", booking.id);
      await updateDoc(bookingRef, {
        status: "deleted",
        updated_at: new Date().toISOString(),
      });
      
      setBookings(bookings.filter(b => b.id !== booking.id));
      setBookingToDelete(null);
      toast.success("Booking deleted successfully");
    } catch (error) {
      console.error("Error deleting booking:", error);
      toast.error("Failed to delete booking. Please try again.");
    }
  };

  const canModifyBooking = (bookingDate: string) => {
    const serviceDateTime = new Date(bookingDate);
    const now = new Date();
    const twentyFourHoursBefore = subHours(serviceDateTime, 24);
    return isAfter(now, twentyFourHoursBefore);
  };

  const handlePayment = async (booking: Booking) => {
    try {
      setProcessingPayments(prev => ({ ...prev, [booking.id]: true }));
      
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

      const { url } = await response.json();
      
      if (!url) {
        throw new Error("No checkout URL received");
      }

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Failed to process payment. Please try again.");
      setProcessingPayments(prev => ({ ...prev, [booking.id]: false }));
    }
  };

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  const currentBookings = bookings.filter((booking) => {
    const bookingDate = new Date(booking.date_time);
    const isFutureBooking = bookingDate > new Date();
    const isPendingPayment = booking.payment_status !== "Paid";
    const isExpired = !canModifyBooking(booking.date_time);
    const isCancelled = booking.status === "cancelled";
    const isDeleted = booking.status === "deleted";
    
    // Only show active bookings in current bookings
    return isFutureBooking && !isCancelled && !isDeleted && !(isExpired && isPendingPayment);
  });

  const pastBookings = bookings.filter((booking) => {
    const bookingDate = new Date(booking.date_time);
    const isPastBooking = bookingDate <= new Date();
    const isExpired = !canModifyBooking(booking.date_time);
    const isPendingPayment = booking.payment_status !== "Paid";
    const isCancelled = booking.status === "cancelled";
    const isDeleted = booking.status === "deleted";
    
    // Show past bookings, cancelled bookings, and expired unpaid bookings, but not deleted ones
    return (isPastBooking || isCancelled || (isExpired && isPendingPayment)) && !isDeleted;
  });

  const getBookingStatus = (booking: Booking) => {
    if (booking.status === "cancelled") {
      return <Badge variant="cancelled">Cancelled</Badge>;
    }
    
    const isExpired = !canModifyBooking(booking.date_time);
    const isPendingPayment = booking.payment_status !== "Paid";
    
    if (isExpired && isPendingPayment) {
      return <Badge variant="expired">Expired</Badge>;
    }
    
    return <Badge variant="success">{booking.status}</Badge>;
  };

  const renderBookingActions = (booking: Booking) => {
    const isExpired = !canModifyBooking(booking.date_time);
    const isPendingPayment = booking.payment_status !== "Paid";
    const hasActiveSession = booking.stripe_session_id && !booking.payment_status;

    if (booking.status === "cancelled") {
      return (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setBookingToDelete(booking)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      );
    }

    if (isExpired && isPendingPayment) {
      return null;
    }

    if (isPendingPayment && !hasActiveSession) {
      return (
        <Button
          variant="default"
          size="sm"
          onClick={() => handlePayment(booking)}
          disabled={processingPayments[booking.id]}
        >
          {processingPayments[booking.id] ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            "Make Payment"
          )}
        </Button>
      );
    }

    if (hasActiveSession) {
      return (
        <Button
          variant="secondary"
          size="sm"
          disabled
        >
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Payment Processing
        </Button>
      );
    }

    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setBookingToCancel(booking)}
      >
        Cancel Booking
      </Button>
    );
  };

  return (
    <div className="min-h-screen bg-muted p-4 sm:p-6">
      <AlertDialog open={!!bookingToCancel} onOpenChange={() => setBookingToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this booking? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, keep booking</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bookingToCancel && handleCancelBooking(bookingToCancel)}
              className="bg-red-600 hover:bg-red-700"
            >
              Yes, cancel booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!bookingToDelete} onOpenChange={() => setBookingToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this booking? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBookingToDelete(null)}>Cancel</AlertDialogCancel>
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
            <DialogTitle>Processing Payment</DialogTitle>
            <DialogDescription>
              Please wait while we redirect you to the payment page...
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center items-center py-4">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>

      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold">Dashboard</h1>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Current Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {currentBookings.length === 0 ? (
              <p className="text-gray-500">No current bookings found.</p>
            ) : (
              <div className="space-y-4">
                {currentBookings.map((booking) => (
                  <Card key={booking.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="space-y-1">
                          <p className="font-medium">
                            {formatServiceType(booking.service_type)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(booking.date_time)}
                          </p>
                          <p className="text-sm text-gray-500">
                            From: {booking.pickup_location}
                          </p>
                          {booking.dropoff_location && (
                            <p className="text-sm text-gray-500">
                              To: {booking.dropoff_location}
                            </p>
                          )}
                          <p className="text-sm text-gray-500">
                            Amount: £{booking.amount.toFixed(2)}
                          </p>
                          {getBookingStatus(booking)}
                        </div>
                        <div className="flex gap-2">
                          {renderBookingActions(booking)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Past Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {pastBookings.length === 0 ? (
              <p>No past bookings.</p>
            ) : (
              <div className="grid gap-4">
                {pastBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="border rounded-lg p-4 sm:p-6 bg-white relative"
                  >
                    <div className="absolute top-4 right-4">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setBookingToDelete(booking)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div className="w-full sm:w-1/2">
                        <h3 className="font-semibold text-lg mb-2">
                          Booking Details
                        </h3>
                        <div className="space-y-2">
                          <p className="text-sm text-gray-600">
                            Booking Reference: {booking.booking_ref}
                          </p>
                          <p className="text-sm text-gray-600">
                            Date: {formatDate(booking.date_time)}
                          </p>
                          <p className="text-sm text-gray-600">
                            Service Type: {formatServiceType(booking.service_type)}
                          </p>
                          <div className="text-sm text-gray-600 flex items-center gap-2">
                            <span>Status:</span>
                            {getBookingStatus(booking)}
                          </div>
                          <p className="text-sm text-gray-600">
                            Total Amount: £{booking.amount.toFixed(2)}
                          </p>
                          <p className="text-sm text-gray-600">
                            Payment Status: {booking.payment_status || "Unpaid"}
                          </p>
                        </div>
                      </div>
                      <div className="w-full sm:w-1/2">
                        <h3 className="font-semibold text-lg mb-2">
                          Location Details
                        </h3>
                        <div className="space-y-2">
                          <p className="text-sm">
                            <span className="font-medium">Pickup:</span>{" "}
                            {booking.pickup_location}
                          </p>
                          {booking.dropoff_location && (
                            <p className="text-sm">
                              <span className="font-medium">Dropoff:</span>{" "}
                              {booking.dropoff_location}
                            </p>
                          )}
                          {booking.service_subtype === "arrival" &&
                            booking.arrival_flight && (
                              <p className="text-sm">
                                <span className="font-medium">
                                  Arrival Flight:
                                </span>{" "}
                                {booking.arrival_flight}
                              </p>
                            )}
                          {booking.service_subtype === "departure" &&
                            booking.departure_flight && (
                              <p className="text-sm">
                                <span className="font-medium">
                                  Departure Flight:
                                </span>{" "}
                                {booking.departure_flight}
                              </p>
                            )}
                          {booking.service_subtype === "connection" && (
                            <>
                              {booking.arrival_flight && (
                                <p className="text-sm">
                                  <span className="font-medium">
                                    Arrival Flight:
                                  </span>{" "}
                                  {booking.arrival_flight}
                                </p>
                              )}
                              {booking.departure_flight && (
                                <p className="text-sm">
                                  <span className="font-medium">
                                    Departure Flight:
                                  </span>{" "}
                                  {booking.departure_flight}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
