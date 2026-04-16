"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getLocations } from "@/lib/supabase";
import type { Location } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { onAuthStateChanged } from "@/lib/supabase-auth";
import { auth, db } from "@/lib/supabase";
import { doc, getDoc } from "@/lib/supabase-db";
import { Icons } from "@/components/ui/icons";

type BookingDetails = {
  pickupLocationId: string | null;
  dropoffLocationId: string | null;
  customPickupAddress: string;
  customDropoffAddress: string;
  date: Date | undefined;
  hour: string;
  minute: string;
  period: string;
  fullName: string;
  email: string;
  phone: string;
  additionalRequests: string;
  passengers: number;
  additionalHours: number;
  bags: number;
  wantBuggy: boolean;
  wantPorter: boolean;
  contactConsent: boolean;
  service_type: "meetAndGreet" | "airportTransfer" | "hourlyHire";
  service_subtype: "arrival" | "departure" | "connection" | null;
  calculatedAmount: number | null;
  flightNumberArrival: string;
  flightNumberDeparture: string;
  airportTransferType?: "one_way" | "round_trip";
  hireDuration?: "full_day" | "half_day";
};

function BookingContent() {
  const router = useRouter();
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [locationsError, setLocationsError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [user, setUser] = useState<any>(null);

  const [bookingDetails, setBookingDetails] = useState<BookingDetails>({
    pickupLocationId: null,
    dropoffLocationId: null,
    customPickupAddress: "",
    customDropoffAddress: "",
    date: new Date(new Date().setDate(new Date().getDate() + 1)),
    hour: "14",
    minute: "00",
    period: "pm",
    fullName: "",
    email: "",
    phone: "",
    additionalRequests: "",
    passengers: 1,
    additionalHours: 0,
    bags: 0,
    wantBuggy: false,
    wantPorter: false,
    contactConsent: false,
    service_type: "meetAndGreet",
    service_subtype: null,
    calculatedAmount: null,
    flightNumberArrival: "",
    flightNumberDeparture: "",
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        // Fetch user profile data
        getDoc(doc(db, "profiles", user.uid)).then((profileDoc) => {
          if (profileDoc.exists()) {
            setBookingDetails((prev) => ({
              ...prev,
              fullName: `${profileDoc.data().firstName} ${profileDoc.data().lastName}`,
              email: user.email || "",
              phone: profileDoc.data().phone || "",
            }));
          }
        });
      }
    });

    // Load service details from localStorage
    const serviceDetails = localStorage.getItem('serviceDetails');
    if (serviceDetails) {
      const details = JSON.parse(serviceDetails);
      setBookingDetails(prev => ({
        ...prev,
        ...details,
        calculatedAmount: details.estimatedPrice || 0,
      }));
    }

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const locationsData = await getLocations();
        setLocations(locationsData);
      } catch (err) {
        console.error("Error fetching locations:", err);
        setLocationsError("Failed to load locations. Please try again.");
      } finally {
        setLocationsLoading(false);
      }
    };

    fetchLocations();
  }, []);

  const handleAuthChoice = async (choice: "signup" | "signin" | "guest") => {
    setShowAuthModal(false);
    if (choice === "signup") {
      window.location.href = `/user/signup?from=booking`;
    } else if (choice === "signin") {
      window.location.href = `/user/signin?from=booking`;
    } else {
      // Handle guest checkout with Stripe
      try {
        setIsProcessingPayment(true);
        const pickupLocation = locations.find(loc => loc.id === bookingDetails.pickupLocationId);
        const dropoffLocation = locations.find(loc => loc.id === bookingDetails.dropoffLocationId);
        
        if (!pickupLocation) {
          setNotification({
            type: "error",
            message: "Pickup location is required",
          });
          setIsProcessingPayment(false);
          return;
        }

        if (!bookingDetails.date) {
          setNotification({
            type: "error",
            message: "Date is required",
          });
          setIsProcessingPayment(false);
          return;
        }

        // Convert date string to Date object if needed
        let bookingDate = bookingDetails.date;
        if (typeof bookingDate === "string") {
          bookingDate = new Date(bookingDate);
        }

        const dateTime = new Date(
          bookingDate.getFullYear(),
          bookingDate.getMonth(),
          bookingDate.getDate(),
          parseInt(bookingDetails.hour),
          parseInt(bookingDetails.minute)
        ).toISOString();

        const response = await fetch("/api/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bookingDetails: {
              fullName: bookingDetails.fullName,
              email: bookingDetails.email,
              phone: bookingDetails.phone,
              pickupLocation: bookingDetails.pickupLocationId === "other" 
                ? bookingDetails.customPickupAddress 
                : pickupLocation?.name,
              dropoffLocation: bookingDetails.service_type === "airportTransfer" 
                ? (bookingDetails.dropoffLocationId === "other"
                  ? bookingDetails.customDropoffAddress
                  : dropoffLocation?.name)
                : null,
              dateTime,
              service_type: bookingDetails.service_type,
              service_subtype: bookingDetails.service_subtype,
              isHireByHour: bookingDetails.service_type === "hourlyHire",
              duration: bookingDetails.additionalHours,
              durationUnit: "hours",
              additionalRequests: bookingDetails.additionalRequests,
              flightNumberArrival: bookingDetails.flightNumberArrival,
              flightNumberDeparture: bookingDetails.flightNumberDeparture,
              passengers: bookingDetails.passengers,
              bags: bookingDetails.bags,
              wantBuggy: bookingDetails.wantBuggy,
              wantPorter: bookingDetails.wantPorter,
              contactConsent: true, // Required for guest checkout
            },
            amount: calculateEstimatedCost(),
            userId: user?.uid || null,
          }),
        });

        const { url, error } = await response.json();

        if (error) {
          setNotification({
            type: "error",
            message: error,
          });
          setIsProcessingPayment(false);
          return;
        }

        // Redirect to Stripe Checkout
        window.location.href = url;
      } catch (err) {
        console.error("Payment error:", err);
        setNotification({
          type: "error",
          message: "Failed to process payment. Please try again.",
        });
        setIsProcessingPayment(false);
      }
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    // Validate required fields
    const errors: Record<string, string> = {};
    if (!bookingDetails.date) errors.date = "Date is required";
    if (!bookingDetails.hour || !bookingDetails.minute) errors.time = "Time is required";
    if (!bookingDetails.fullName) errors.fullName = "Full name is required";
    if (!bookingDetails.email) errors.email = "Email is required";
    if (!bookingDetails.phone) errors.phone = "Phone number is required";
    
    // Validate pickup location
    if (!bookingDetails.pickupLocationId) {
      errors.pickupLocation = "Pickup location is required";
    } else if (bookingDetails.pickupLocationId === "other" && !bookingDetails.customPickupAddress) {
      errors.pickupLocation = "Custom pickup address is required";
    }

    // Validate dropoff location for airport transfer
    if (bookingDetails.service_type === "airportTransfer") {
      if (!bookingDetails.dropoffLocationId) {
        errors.dropoffLocation = "Dropoff location is required";
      } else if (bookingDetails.dropoffLocationId === "other" && !bookingDetails.customDropoffAddress) {
        errors.dropoffLocation = "Custom dropoff address is required";
      }
    }
    
    if (bookingDetails.service_type === "meetAndGreet") {
      if ((bookingDetails.service_subtype === "arrival" || bookingDetails.service_subtype === "connection") && !bookingDetails.flightNumberArrival) {
        errors.flightNumberArrival = "Arrival flight number is required";
      }
      if ((bookingDetails.service_subtype === "departure" || bookingDetails.service_subtype === "connection") && !bookingDetails.flightNumberDeparture) {
        errors.flightNumberDeparture = "Departure flight number is required";
      }
    }

    if (bookingDetails.service_type === "airportTransfer") {
      const pickupLocation = locations.find(loc => loc.id === bookingDetails.pickupLocationId);
      const dropoffLocation = locations.find(loc => loc.id === bookingDetails.dropoffLocationId);

      if (pickupLocation && pickupLocation.id !== "other" && !bookingDetails.flightNumberArrival) {
        errors.flightNumberArrival = "Pickup flight number is required";
      }
      if (dropoffLocation && dropoffLocation.id !== "other" && !bookingDetails.flightNumberDeparture) {
        errors.flightNumberDeparture = "Dropoff flight number is required";
      }
    }
    
    if (Object.keys(errors).length > 0) {
      setNotification({
        type: "error",
        message: Object.values(errors).join("\n"),
      });
      return;
    }

    // If user is logged in, proceed to payment
    if (user) {
      try {
        setIsProcessingPayment(true);
        const pickupLocation = locations.find(loc => loc.id === bookingDetails.pickupLocationId);
        const dropoffLocation = locations.find(loc => loc.id === bookingDetails.dropoffLocationId);
        
        if (!bookingDetails.date) {
          setNotification({
            type: "error",
            message: "Date is required",
          });
          setIsProcessingPayment(false);
          return;
        }

        // Convert date string to Date object if needed
        let bookingDate = bookingDetails.date;
        if (typeof bookingDate === "string") {
          bookingDate = new Date(bookingDate);
        }

        const dateTime = new Date(
          bookingDate.getFullYear(),
          bookingDate.getMonth(),
          bookingDate.getDate(),
          parseInt(bookingDetails.hour),
          parseInt(bookingDetails.minute)
        ).toISOString();

        const response = await fetch("/api/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bookingDetails: {
              fullName: bookingDetails.fullName,
              email: bookingDetails.email,
              phone: bookingDetails.phone,
              pickupLocation: bookingDetails.pickupLocationId === "other" 
                ? bookingDetails.customPickupAddress 
                : pickupLocation?.name,
              dropoffLocation: bookingDetails.service_type === "airportTransfer" 
                ? (bookingDetails.dropoffLocationId === "other"
                  ? bookingDetails.customDropoffAddress
                  : dropoffLocation?.name)
                : null,
              dateTime,
              service_type: bookingDetails.service_type,
              service_subtype: bookingDetails.service_subtype,
              isHireByHour: bookingDetails.service_type === "hourlyHire",
              duration: bookingDetails.additionalHours,
              durationUnit: "hours",
              additionalRequests: bookingDetails.additionalRequests,
              flightNumberArrival: bookingDetails.flightNumberArrival,
              flightNumberDeparture: bookingDetails.flightNumberDeparture,
              passengers: bookingDetails.passengers,
              bags: bookingDetails.bags,
              wantBuggy: bookingDetails.wantBuggy,
              wantPorter: bookingDetails.wantPorter,
              contactConsent: true,
            },
            amount: bookingDetails.calculatedAmount || calculateEstimatedCost(),
            userId: user?.uid || null,
          }),
        });

        const { url, error } = await response.json();

        if (error) {
          setNotification({
            type: "error",
            message: error,
          });
          setIsProcessingPayment(false);
          return;
        }

        // Redirect to Stripe Checkout
        window.location.href = url;
      } catch (err) {
        console.error("Payment error:", err);
        setNotification({
          type: "error",
          message: "Failed to process payment. Please try again.",
        });
        setIsProcessingPayment(false);
      }
    } else {
      // Show auth modal for non-logged in users
      setShowAuthModal(true);
    }
  };

  // Calculate estimated cost
  const calculateEstimatedCost = () => {
    // Get the stored service details from localStorage
    const storedServiceDetails = localStorage.getItem('serviceDetails');
    if (storedServiceDetails) {
      const { estimatedPrice } = JSON.parse(storedServiceDetails);
      return estimatedPrice;
    }

    // Fallback calculation if no stored price
    let basePrice = 0;
    switch (bookingDetails.service_type) {
      case "meetAndGreet":
        basePrice = bookingDetails.service_subtype === "connection" ? 280 : 140;
        break;
      case "airportTransfer":
        basePrice = 100;
        break;
      case "hourlyHire":
        basePrice = bookingDetails.additionalHours * 180;
        break;
    }

    if (bookingDetails.wantBuggy) basePrice += 80;
    if (bookingDetails.wantPorter) basePrice += 65;
    if (bookingDetails.bags > 0) basePrice += bookingDetails.bags * 10;

    // Add VAT (20%)
    const vatAmount = basePrice * 0.20;
    return basePrice + vatAmount;
  };

  if (locationsLoading) {
    return (
      <div className="min-h-screen bg-muted p-6">
        <div className="container mx-auto">
          <div className="flex justify-center items-center h-64">
            <Icons.spinner className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="flex flex-col min-h-screen">
      <div className="bg-muted py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-center">
            Book Your Journey
          </h1>
        </div>
      </div>

      <section className="py-8 md:py-16">
        <div className="container mx-auto px-4">
          {notification && (
            <div
              className={`p-4 mb-4 rounded ${
                notification.type === "success"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {notification.message}
            </div>
          )}

          {locationsLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : locationsError ? (
            <p className="text-red-500 text-center">{locationsError}</p>
          ) : (
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="lg:w-1/2 bg-gray-200 p-4 md:p-6 rounded-lg">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold">Booking Summary</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push('/#estimate')}
                      className="flex items-center gap-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Go Back
                    </Button>
                  </div>
                  <div className="space-y-2 text-sm md:text-base">
                    {bookingDetails.service_type === "meetAndGreet" ? (
                      <>
                        <p>
                          <strong>Service Type:</strong> Meet and Greet{bookingDetails.service_subtype ? ` (${bookingDetails.service_subtype.charAt(0).toUpperCase() + bookingDetails.service_subtype.slice(1)})` : ""}
                        </p>
                        <p>
                          <strong>Meet up Location:</strong> {locations.find((loc) => loc.id === bookingDetails.pickupLocationId)?.name || "Not selected"}
                        </p>
                        {bookingDetails.service_subtype === "connection" && (
                          <p>
                            <strong>Drop off Location:</strong> {locations.find((loc) => loc.id === bookingDetails.dropoffLocationId)?.name || "Not selected"}
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <p>
                          <strong>Service Type:</strong> {bookingDetails.service_type === "airportTransfer" ? "Airport Transfer" : "Hire by Hour"}
                        </p>
                        <p>
                          <strong>Pickup Location:</strong>{" "}
                          {bookingDetails.pickupLocationId === "other"
                            ? bookingDetails.customPickupAddress
                            : locations.find((loc) => loc.id === bookingDetails.pickupLocationId)?.name || "Not selected"}
                        </p>
                        {bookingDetails.service_type === "airportTransfer" && (
                          <p>
                            <strong>Dropoff Location:</strong>{" "}
                            {bookingDetails.dropoffLocationId === "other"
                              ? bookingDetails.customDropoffAddress
                              : locations.find((loc) => loc.id === bookingDetails.dropoffLocationId)?.name || "Not selected"}
                          </p>
                        )}
                        <p>
                          <strong>Passengers:</strong> {bookingDetails.passengers}
                        </p>
                        <p>
                          <strong>Additional Hours:</strong> {bookingDetails.additionalHours}
                        </p>
                      </>
                    )}
                    <p>
                      <strong>Date:</strong>{" "}
                      {bookingDetails.date
                        ? new Date(bookingDetails.date).toLocaleDateString()
                        : "Not selected"}
                    </p>
                    <p>
                      <strong>Time:</strong>{" "}
                      {bookingDetails.hour &&
                            bookingDetails.minute
                        ? `${bookingDetails.hour}:${bookingDetails.minute}`
                        : "Not selected"}
                    </p>
                    {bookingDetails.service_type === "meetAndGreet" && (
                      <>
                        <p>
                          <strong>Bags:</strong> {bookingDetails.bags}
                        </p>
                        <p>
                          <strong>Buggy:</strong>{" "}
                          {bookingDetails.wantBuggy ? "Yes" : "No"}
                        </p>
                        <p>
                          <strong>Porter:</strong>{" "}
                          {bookingDetails.wantPorter ? "Yes" : "No"}
                        </p>
                      </>
                    )}
                    {(bookingDetails.service_type === "airportTransfer" ||
                      bookingDetails.service_type === "hourlyHire") && (
                      <>
                        <p>
                          <strong>Bags:</strong> {bookingDetails.bags}
                        </p>
                      </>
                    )}
                    <div className="border-t pt-4 mt-4">
                      <p className="text-lg font-semibold">
                        <strong>Estimated Cost:</strong> £{calculateEstimatedCost().toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="lg:w-1/2 bg-gray-50 p-4 md:p-6 rounded-lg">
                  <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Enter Your Details</h2>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {bookingDetails.service_type === "meetAndGreet" && (
                      <>
                        {bookingDetails.service_subtype === "arrival" && (
                          <div>
                            <Label>
                              Arrival Flight Number
                              <span className="text-red-500 ml-1">*</span>
                            </Label>
                            <Input
                              value={bookingDetails.flightNumberArrival}
                              onChange={(e) =>
                                setBookingDetails((prev) => ({
                                  ...prev,
                                  flightNumberArrival: e.target.value,
                                }))
                              }
                              placeholder="Enter arrival flight number"
                            />
                          </div>
                        )}
                        {bookingDetails.service_subtype === "departure" && (
                          <div>
                            <Label>
                              Departure Flight Number
                              <span className="text-red-500 ml-1">*</span>
                            </Label>
                            <Input
                              value={bookingDetails.flightNumberDeparture}
                              onChange={(e) =>
                                setBookingDetails((prev) => ({
                                  ...prev,
                                  flightNumberDeparture: e.target.value,
                                }))
                              }
                              placeholder="Enter departure flight number"
                            />
                          </div>
                        )}
                        {bookingDetails.service_subtype === "connection" && (
                          <>
                            <div>
                              <Label>
                                Arrival Flight Number
                                <span className="text-red-500 ml-1">*</span>
                              </Label>
                              <Input
                                value={bookingDetails.flightNumberArrival}
                                onChange={(e) =>
                                  setBookingDetails((prev) => ({
                                    ...prev,
                                    flightNumberArrival: e.target.value,
                                  }))
                                }
                                placeholder="Enter arrival flight number"
                              />
                            </div>
                            <div>
                              <Label>
                                Departure Flight Number
                                <span className="text-red-500 ml-1">*</span>
                              </Label>
                              <Input
                                value={bookingDetails.flightNumberDeparture}
                                onChange={(e) =>
                                  setBookingDetails((prev) => ({
                                    ...prev,
                                    flightNumberDeparture: e.target.value,
                                  }))
                                }
                                placeholder="Enter departure flight number"
                              />
                            </div>
                          </>
                        )}
                      </>
                    )}

                    {bookingDetails.service_type === "airportTransfer" && (
                      <>
                        {bookingDetails.pickupLocationId && bookingDetails.pickupLocationId !== "other" && (
                          <div>
                            <Label>
                              Pickup Flight Number
                              <span className="text-red-500 ml-1">*</span>
                            </Label>
                            <Input
                              value={bookingDetails.flightNumberArrival}
                              onChange={(e) =>
                                setBookingDetails((prev) => ({
                                  ...prev,
                                  flightNumberArrival: e.target.value,
                                }))
                              }
                              placeholder="Enter pickup flight number"
                            />
                          </div>
                        )}
                        {bookingDetails.dropoffLocationId && bookingDetails.dropoffLocationId !== "other" && (
                          <div>
                            <Label>
                              Dropoff Flight Number
                              <span className="text-red-500 ml-1">*</span>
                            </Label>
                            <Input
                              value={bookingDetails.flightNumberDeparture}
                              onChange={(e) =>
                                setBookingDetails((prev) => ({
                                  ...prev,
                                  flightNumberDeparture: e.target.value,
                                }))
                              }
                              placeholder="Enter dropoff flight number"
                            />
                          </div>
                        )}
                      </>
                    )}

                    <div>
                      <Label>
                        Full Name
                        <span className="text-red-500 ml-1">*</span>
                      </Label>
                      <Input
                        value={bookingDetails.fullName}
                        onChange={(e) =>
                          setBookingDetails((prev) => ({
                            ...prev,
                            fullName: e.target.value,
                          }))
                        }
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div>
                      <Label>
                        Email
                        <span className="text-red-500 ml-1">*</span>
                      </Label>
                      <Input
                        type="email"
                        value={bookingDetails.email}
                        onChange={(e) =>
                          setBookingDetails((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        placeholder="Enter your email"
                      />
                    </div>
                    <div>
                      <Label>
                        Phone Number
                        <span className="text-red-500 ml-1">*</span>
                      </Label>
                      <Input
                        type="tel"
                        value={bookingDetails.phone}
                        onChange={(e) =>
                          setBookingDetails((prev) => ({
                            ...prev,
                            phone: e.target.value,
                          }))
                        }
                        placeholder="Enter your phone number"
                      />
                    </div>
                    <div>
                      <Label>Additional Notes</Label>
                      <Textarea
                        value={bookingDetails.additionalRequests}
                        onChange={(e) =>
                          setBookingDetails((prev) => ({
                            ...prev,
                            additionalRequests: e.target.value,
                          }))
                        }
                        placeholder="Any additional requests or information"
                      />
                    </div>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        type="submit"
                        className="w-full"
                      >
                        Continue to Booking
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <Dialog open={showAuthModal && !user} onOpenChange={setShowAuthModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Continue Your Booking</DialogTitle>
            <DialogDescription>
              Would you like to sign up or sign in to save your booking history, track your booking status, receive updates, and make changes?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-4">
            <Button onClick={() => handleAuthChoice("signup")}>Sign Up</Button>
            <Button onClick={() => handleAuthChoice("signin")}>Sign In</Button>
            {!user && (
              <Button variant="outline" onClick={() => handleAuthChoice("guest")}>
                Continue as Guest
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isProcessingPayment} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Processing Payment</DialogTitle>
            <DialogDescription>
              Please wait while we process your payment...
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center items-center py-4">
            <Icons.spinner className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

export default function Booking() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BookingContent />
    </Suspense>
  );
}