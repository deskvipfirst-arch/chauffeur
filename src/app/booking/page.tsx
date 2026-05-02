"use client";
import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
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
import { onAuthStateChanged } from "@/lib/supabase/browser";
import { auth, supabase } from "@/lib/supabase/browser";
import { Icons } from "@/components/ui/icons";
import { loadStoredBookingDraft, saveStoredBookingDraft } from "@/lib/bookingFlow";
import { getUserDisplayName } from "@/lib/userDisplay";

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

type BookingProfile = {
  phone?: string;
  phoneNumber?: string;
  phone_number?: string;
} & Record<string, unknown>;

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
  const [user, setUser] = useState<import('@/lib/supabase/browser').CompatUser | null>(null);
  const notificationRef = useRef<HTMLDivElement | null>(null);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });

    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        notificationRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        notificationRef.current?.focus();
      });
    }
  };

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
    service_subtype: "arrival",
    calculatedAmount: null,
    flightNumberArrival: "",
    flightNumberDeparture: "",
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        (async () => {
          const { data: profileDoc, error } = await supabase.from("profiles").select("*").eq("id", nextUser.uid).single();
          if (error) {
            console.warn("Profile prefill warning:", error);
            setBookingDetails((prev) => ({
              ...prev,
              fullName: prev.fullName || getUserDisplayName(undefined, nextUser),
              email: prev.email || nextUser.email || "",
            }));
            return;
          }

          const profile = (profileDoc || {}) as BookingProfile;
          const profileName = getUserDisplayName(profile, nextUser);
          const phone = String(
            profile.phone || profile.phoneNumber || profile.phone_number || ""
          ).trim();

          setBookingDetails((prev) => ({
            ...prev,
            fullName: prev.fullName || profileName,
            email: prev.email || nextUser.email || "",
            phone: prev.phone || phone,
          }));
        })();
      }
    });

    const storedDraft = loadStoredBookingDraft();
    if (storedDraft) {
      setBookingDetails((prev) => ({
        ...prev,
        ...storedDraft,
        date: storedDraft.date ? new Date(storedDraft.date) : prev.date,
        calculatedAmount: storedDraft.calculatedAmount ?? storedDraft.estimatedPrice ?? prev.calculatedAmount,
      }));
    }

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await fetch("/api/locations", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to fetch locations");
        }

        const locationsData = (await response.json()) as Location[];
        setLocations(Array.isArray(locationsData) ? locationsData : []);
      } catch (err) {
        console.error("Error fetching locations:", err);
        setLocationsError("Locations could not be loaded automatically. You can still continue by choosing Other and entering the address manually.");
        setLocations([]);
      } finally {
        setLocationsLoading(false);
      }
    };

    fetchLocations();
  }, []);

  useEffect(() => {
    saveStoredBookingDraft({
      ...bookingDetails,
      date: bookingDetails.date instanceof Date ? bookingDetails.date.toISOString() : bookingDetails.date,
    });
  }, [bookingDetails]);

  const handleAuthChoice = async (choice: "signup" | "signin" | "guest") => {
    setShowAuthModal(false);
    saveStoredBookingDraft({
      ...bookingDetails,
      date: bookingDetails.date instanceof Date ? bookingDetails.date.toISOString() : bookingDetails.date,
    });

    if (choice === "signup") {
      router.push(`/user/signup?from=booking`);
    } else if (choice === "signin") {
      router.push(`/user/signin?from=booking`);
    } else {
      // Handle guest checkout with Stripe
      try {
        setIsProcessingPayment(true);
        const pickupLocation = locations.find(loc => loc.id === bookingDetails.pickupLocationId);
        const dropoffLocation = locations.find(loc => loc.id === bookingDetails.dropoffLocationId);
        
        if (!pickupLocation && bookingDetails.pickupLocationId !== "other") {
          showNotification("error", "Pickup location is required");
          setIsProcessingPayment(false);
          return;
        }

        if (!bookingDetails.date) {
          showNotification("error", "Date is required");
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
          showNotification("error", error);
          setIsProcessingPayment(false);
          return;
        }

        // Redirect to Stripe Checkout
        window.location.href = url;
      } catch (err) {
        console.error("Payment error:", err);
        showNotification("error", "Failed to process payment. Please try again.");
        setIsProcessingPayment(false);
      }
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setNotification(null);

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
      showNotification("error", Object.values(errors).join("\n"));
      return;
    }

    // If user is logged in, proceed to payment
    if (user) {
      try {
        setIsProcessingPayment(true);
        const pickupLocation = locations.find(loc => loc.id === bookingDetails.pickupLocationId);
        const dropoffLocation = locations.find(loc => loc.id === bookingDetails.dropoffLocationId);
        
        if (!bookingDetails.date) {
          showNotification("error", "Date is required");
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
          showNotification("error", error);
          setIsProcessingPayment(false);
          return;
        }

        // Redirect to Stripe Checkout
        window.location.href = url;
      } catch (err) {
        console.error("Payment error:", err);
        showNotification("error", "Failed to process payment. Please try again.");
        setIsProcessingPayment(false);
      }
    } else {
      // Show auth modal for non-logged in users
      setShowAuthModal(true);
    }
  };

  // Calculate estimated cost
  const calculateEstimatedCost = () => {
    if (typeof bookingDetails.calculatedAmount === "number" && bookingDetails.calculatedAmount > 0) {
      return bookingDetails.calculatedAmount;
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

  const bookingDateValue =
    bookingDetails.date && !Number.isNaN(new Date(bookingDetails.date).getTime())
      ? new Date(bookingDetails.date).toISOString().split("T")[0]
      : "";
  const formControlClassName = "mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

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
              ref={notificationRef}
              role="alert"
              aria-live="polite"
              tabIndex={-1}
              className={`mb-4 rounded p-4 whitespace-pre-line outline-none ${
                notification.type === "success"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {notification.message}
            </div>
          )}

          <div className="max-w-4xl mx-auto">
            {locationsLoading && (
              <div className="mb-4 rounded border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                Loading available locations...
              </div>
            )}
            {locationsError && (
              <div className="mb-4 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {locationsError}
              </div>
            )}

              <div className="flex flex-col lg:flex-row gap-6">
                <div className="lg:w-1/2 bg-gray-50 border p-4 md:p-6 rounded-lg">
                  <div className="flex justify-between items-start mb-4 gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">Booking Summary</h3>
                      <p className="text-sm text-muted-foreground">Edit or fill in any missing trip details here.</p>
                    </div>
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
                  <div className="space-y-4 text-sm md:text-base">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="booking-service-type">Service Type</Label>
                        <select
                          id="booking-service-type"
                          className={formControlClassName}
                          value={bookingDetails.service_type}
                          onChange={(e) =>
                            setBookingDetails((prev) => ({
                              ...prev,
                              service_type: e.target.value as BookingDetails["service_type"],
                              service_subtype: e.target.value === "meetAndGreet" ? prev.service_subtype || "arrival" : null,
                              calculatedAmount: null,
                            }))
                          }
                        >
                          <option value="meetAndGreet">Meet and Greet</option>
                          <option value="airportTransfer">Airport Transfer</option>
                          <option value="hourlyHire">Hire by Hour</option>
                        </select>
                      </div>

                      {bookingDetails.service_type === "meetAndGreet" ? (
                        <div>
                          <Label htmlFor="booking-service-option">Service Option</Label>
                          <select
                            id="booking-service-option"
                            className={formControlClassName}
                            value={bookingDetails.service_subtype || "arrival"}
                            onChange={(e) =>
                              setBookingDetails((prev) => ({
                                ...prev,
                                service_subtype: e.target.value as BookingDetails["service_subtype"],
                                calculatedAmount: null,
                              }))
                            }
                          >
                            <option value="arrival">Arrival</option>
                            <option value="departure">Departure</option>
                            <option value="connection">Connection</option>
                          </select>
                        </div>
                      ) : (
                        <div>
                          <Label htmlFor="booking-additional-hours-summary">Additional Hours</Label>
                          <Input
                            id="booking-additional-hours-summary"
                            type="number"
                            min={0}
                            value={bookingDetails.additionalHours}
                            onChange={(e) =>
                              setBookingDetails((prev) => ({
                                ...prev,
                                additionalHours: Number(e.target.value || 0),
                                calculatedAmount: null,
                              }))
                            }
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="booking-pickup-location">
                        {bookingDetails.service_type === "meetAndGreet" ? "Meet up Location" : "Pickup Location"}
                      </Label>
                      <select
                        id="booking-pickup-location"
                        className={formControlClassName}
                        value={bookingDetails.pickupLocationId || ""}
                        onChange={(e) =>
                          setBookingDetails((prev) => ({
                            ...prev,
                            pickupLocationId: e.target.value,
                            calculatedAmount: null,
                          }))
                        }
                      >
                        <option value="">Select a location</option>
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name}
                          </option>
                        ))}
                        <option value="other">Other</option>
                      </select>
                    </div>

                    {bookingDetails.pickupLocationId === "other" && (
                      <div>
                        <Label htmlFor="booking-custom-pickup">Custom Meet up Address</Label>
                        <Input
                          id="booking-custom-pickup"
                          value={bookingDetails.customPickupAddress}
                          onChange={(e) =>
                            setBookingDetails((prev) => ({
                              ...prev,
                              customPickupAddress: e.target.value,
                              calculatedAmount: null,
                            }))
                          }
                          placeholder="Enter the meet up or pickup address"
                        />
                      </div>
                    )}

                    {(bookingDetails.service_type === "airportTransfer" || bookingDetails.service_subtype === "connection") && (
                      <>
                        <div>
                          <Label htmlFor="booking-dropoff-location">Drop-off Location</Label>
                          <select
                            id="booking-dropoff-location"
                            className={formControlClassName}
                            value={bookingDetails.dropoffLocationId || ""}
                            onChange={(e) =>
                              setBookingDetails((prev) => ({
                                ...prev,
                                dropoffLocationId: e.target.value,
                                calculatedAmount: null,
                              }))
                            }
                          >
                            <option value="">Select a location</option>
                            {locations.map((loc) => (
                              <option key={loc.id} value={loc.id}>
                                {loc.name}
                              </option>
                            ))}
                            <option value="other">Other</option>
                          </select>
                        </div>

                        {bookingDetails.dropoffLocationId === "other" && (
                          <div>
                            <Label htmlFor="booking-custom-dropoff">Custom Drop-off Address</Label>
                            <Input
                              id="booking-custom-dropoff"
                              value={bookingDetails.customDropoffAddress}
                              onChange={(e) =>
                                setBookingDetails((prev) => ({
                                  ...prev,
                                  customDropoffAddress: e.target.value,
                                  calculatedAmount: null,
                                }))
                              }
                              placeholder="Enter the drop-off address"
                            />
                          </div>
                        )}
                      </>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="booking-date">Date</Label>
                        <Input
                          id="booking-date"
                          type="date"
                          value={bookingDateValue}
                          onChange={(e) =>
                            setBookingDetails((prev) => ({
                              ...prev,
                              date: e.target.value ? new Date(`${e.target.value}T12:00:00`) : undefined,
                              calculatedAmount: null,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="booking-hour">Hour</Label>
                        <select
                          id="booking-hour"
                          className={formControlClassName}
                          value={bookingDetails.hour}
                          onChange={(e) =>
                            setBookingDetails((prev) => ({
                              ...prev,
                              hour: e.target.value,
                              calculatedAmount: null,
                            }))
                          }
                        >
                          {Array.from({ length: 24 }, (_, index) => {
                            const value = String(index).padStart(2, "0");
                            return (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="booking-minute">Minute</Label>
                        <select
                          id="booking-minute"
                          className={formControlClassName}
                          value={bookingDetails.minute}
                          onChange={(e) =>
                            setBookingDetails((prev) => ({
                              ...prev,
                              minute: e.target.value,
                              calculatedAmount: null,
                            }))
                          }
                        >
                          {["00", "15", "30", "45"].map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="booking-passengers">Passengers</Label>
                        <Input
                          id="booking-passengers"
                          type="number"
                          min={1}
                          value={bookingDetails.passengers}
                          onChange={(e) =>
                            setBookingDetails((prev) => ({
                              ...prev,
                              passengers: Number(e.target.value || 1),
                              calculatedAmount: null,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="booking-bags">Bags</Label>
                        <Input
                          id="booking-bags"
                          type="number"
                          min={0}
                          value={bookingDetails.bags}
                          onChange={(e) =>
                            setBookingDetails((prev) => ({
                              ...prev,
                              bags: Number(e.target.value || 0),
                              calculatedAmount: null,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="booking-extra-hours">Extra Hours</Label>
                        <Input
                          id="booking-extra-hours"
                          type="number"
                          min={0}
                          value={bookingDetails.additionalHours}
                          onChange={(e) =>
                            setBookingDetails((prev) => ({
                              ...prev,
                              additionalHours: Number(e.target.value || 0),
                              calculatedAmount: null,
                            }))
                          }
                        />
                      </div>
                    </div>

                    {bookingDetails.service_type === "meetAndGreet" && (
                      <div className="flex flex-wrap gap-4 text-sm">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={bookingDetails.wantBuggy}
                            onChange={(e) =>
                              setBookingDetails((prev) => ({
                                ...prev,
                                wantBuggy: e.target.checked,
                                calculatedAmount: null,
                              }))
                            }
                          />
                          Need buggy service
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={bookingDetails.wantPorter}
                            onChange={(e) =>
                              setBookingDetails((prev) => ({
                                ...prev,
                                wantPorter: e.target.checked,
                                calculatedAmount: null,
                              }))
                            }
                          />
                          Need porter service
                        </label>
                      </div>
                    )}

                    <div className="border-t pt-4 mt-4">
                      <p className="text-lg font-semibold">
                        <strong>Estimated Cost:</strong> £{calculateEstimatedCost().toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="lg:w-1/2 bg-gray-50 p-4 md:p-6 rounded-lg">
                  <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-2">Complete Your Booking</h2>
                  <p className="text-sm text-muted-foreground mb-4 md:mb-6">
                    Your trip details are now editable in the Booking Summary panel.
                  </p>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="rounded-lg border bg-white p-4 text-sm text-muted-foreground">
                      Review the summary on the left, then finish the passenger and contact details here.
                    </div>

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
                        disabled={isProcessingPayment}
                      >
                        {isProcessingPayment ? (
                          <>
                            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                            Opening secure payment...
                          </>
                        ) : user ? (
                          "Continue to Secure Payment"
                        ) : (
                          "Continue to Booking"
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        {user
                          ? "You will be redirected to secure payment after review."
                          : "Next, you can sign in, sign up, or continue as a guest."}
                      </p>
                    </div>
                  </form>
                </div>
              </div>
            </div>
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

