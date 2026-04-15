"use client";
import { useState, useEffect, useMemo } from "react";
import { addDays, isWithinInterval, startOfDay } from "date-fns";
import { getFestivePeriods } from "./festive-periods";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import JourneyForm from "./components/JourneyForm";
import PriceModal from "./components/PriceModal";
import { AlertCircle } from "lucide-react";
import type { Location, Vehicle } from "@/lib/types";
import { useRouter, useSearchParams } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import VehicleSelection from "./components/VehicleSelection";

export interface BookingData {
  serviceType: string;
  dateTime: string;
  passengers: number;
  locationId: string;
  additionalServices: {
    buggy?: boolean;
    porter?: boolean;
    bags?: number;
  };
  flightDetails?: {
    arrival?: string;
    departure?: string;
  };
  estimatedPrice: number;
}

export function PriceEstimator() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isLocationsLoading, setIsLocationsLoading] = useState(true);
  const [isVehiclesLoading, setIsVehiclesLoading] = useState(true);
  const [serviceType, setServiceType] = useState<
    "meetAndGreet" | "airportTransfer" | "hourlyHire"
  >("meetAndGreet");
  const [date, setDate] = useState<Date | undefined>(addDays(new Date(), 1));
  const [hour, setHour] = useState("14"); // 24-hour format
  const [minute, setMinute] = useState("00");
  const [passengers, setPassengers] = useState(1);
  const [wantBuggy, setWantBuggy] = useState(false);
  const [wantPorter, setWantPorter] = useState(false);
  const [bags, setBags] = useState(0);
  const [additionalHours, setAdditionalHours] = useState(0);
  const [serviceSubType, setServiceSubType] = useState<
    "arrival" | "departure" | "connection"
  >("arrival");
  const [locations, setLocations] = useState<Location[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const [priceBreakdown, setPriceBreakdown] = useState<
    { description: string; amount: number }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [flightNumberArrival, setFlightNumberArrival] = useState("");
  const [flightNumberDeparture, setFlightNumberDeparture] = useState("");
  const [vehicle, setVehicle] = useState<string>("");
  const [pickupLocationId, setPickupLocationId] = useState<string>("");
  const [dropoffLocationId, setDropoffLocationId] = useState<string>("");
  const [extraCharges, setExtraCharges] = useState<Record<string, any>>({});
  const [serviceRates, setServiceRates] = useState<Record<string, any>>({});
  const [customPickupAddress, setCustomPickupAddress] = useState("");
  const [customDropoffAddress, setCustomDropoffAddress] = useState("");
  const [isPriceEstimationDisabled, setIsPriceEstimationDisabled] = useState(false);
  const [priceEstimationMessage, setPriceEstimationMessage] = useState("");
  const [showVehicleSelection, setShowVehicleSelection] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch locations, vehicles, and service rates in parallel
        const [locationsResponse, vehiclesSnap, serviceRatesSnap, extraChargesSnap] = await Promise.all([
          fetch('/api/locations').then(res => res.json()),
          getDocs(collection(db, "vehicles")),
          getDocs(collection(db, "service_rates")),
          getDocs(collection(db, "extra_charges")),
        ]);
        setLocations(locationsResponse);
        
        // Map vehicles from Firebase
        const vehiclesData: Vehicle[] = [];
        vehiclesSnap.forEach(doc => {
          vehiclesData.push({
            id: doc.id,
            ...doc.data()
          } as Vehicle);
        });
        setVehicles(vehiclesData);
        
        // Map service rates by id
        const rates: Record<string, any> = {};
        serviceRatesSnap.forEach(doc => {
          rates[doc.id] = doc.data();
        });
        setServiceRates(rates);

        // Map extra charges by id
        const charges: Record<string, any> = {};
        extraChargesSnap.forEach(doc => {
          charges[doc.id] = doc.data();
        });
        setExtraCharges(charges);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data. Please try again later.");
      } finally {
        setIsLoading(false);
        setIsLocationsLoading(false);
        setIsVehiclesLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    // Check if price estimation should be disabled
    if (serviceType === "airportTransfer" && pickupLocationId && dropoffLocationId) {
      const pickup = locations.find(l => l.id === pickupLocationId);
      const dropoff = locations.find(l => l.id === dropoffLocationId);
      
      if (pickupLocationId === "other" && dropoffLocationId === "other") {
        setIsPriceEstimationDisabled(true);
        setPriceEstimationMessage("Please choose 'Hire by hour' service for custom address to custom address transfers.");
        return;
      }

      if (serviceType === "airportTransfer" && serviceSubType === "connection") {
        const pickupAirport = pickup?.name.split(" ")[0].toLowerCase();
        const dropoffAirport = dropoff?.name.split(" ")[0].toLowerCase();
        if (pickupAirport !== dropoffAirport) {
          setIsPriceEstimationDisabled(true);
          setPriceEstimationMessage("For connections between different airports, please select 'Airport Transfer' as the service type.");
          return;
        }
      }
    }
    
    setIsPriceEstimationDisabled(false);
    setPriceEstimationMessage("");
  }, [serviceType, serviceSubType, pickupLocationId, dropoffLocationId, locations]);

  useEffect(() => {
    // Pre-select service type and vehicle from query params
    const serviceTypeParam = searchParams.get("service_type");
    const vehicleParam = searchParams.get("vehicle");
    if (serviceTypeParam === "hire_by_hour") {
      setServiceType("hourlyHire");
    }
    if (vehicleParam) {
      setVehicle(vehicleParam);
    }
  }, [searchParams]);

  const currentYear = new Date().getFullYear();
  const FESTIVE_PERIODS = useMemo(
    () => getFestivePeriods(currentYear),
    [currentYear]
  );


  const calculatePrice = (formData?: any) => {
    let basePrice = 0;
    let surcharges = 0;
    const breakdown: { description: string; amount: number }[] = [];

    // Always get additionalHours from the correct source and ensure it's a number
    const additionalHoursValue = Number(formData?.additionalHours || additionalHours) || 0;

    const selectedDateTime = date ? new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      parseInt(hour),
      parseInt(minute)
    ) : new Date();

    // Check if service time is during unsocial hours (22:00 - 06:00)
    const isUnsocialHours = selectedDateTime.getHours() >= 22 || selectedDateTime.getHours() < 6;

    // Check if service date falls within festive periods
    const isFestivePeriod = FESTIVE_PERIODS.some(period =>
      isWithinInterval(startOfDay(selectedDateTime), {
        start: startOfDay(new Date(period.start)),
        end: startOfDay(new Date(period.end))
      })
    );

    // Calculate base price
    switch (serviceType) {
      case "meetAndGreet":
        if (serviceSubType === "connection" && pickupLocationId && dropoffLocationId) {
          const pickup = locations.find(l => l.id === pickupLocationId);
          const dropoff = locations.find(l => l.id === dropoffLocationId);
          if (pickup && dropoff) {
            const pickupTerminal = pickup.name.trim().toLowerCase();
            const dropoffTerminal = dropoff.name.trim().toLowerCase();
            if (pickupTerminal === dropoffTerminal) {
              basePrice = serviceRates["meet-assist-base"]?.baseRate || 140;
              breakdown.push({ description: "Base Rate (Same Terminal, 2 hours, up to 2 passengers)", amount: basePrice });
            } else {
              basePrice = serviceRates["meet-assist-connection"]?.baseRate || 180;
              breakdown.push({ description: "Base Rate (Different Terminals, 2 hours, up to 2 passengers)", amount: basePrice });
            }
          } else {
            basePrice = serviceRates["meet-assist-base"]?.baseRate || 140;
            breakdown.push({ description: "Base Rate (2 hours, up to 2 passengers)", amount: basePrice });
          }
        } else {
          basePrice = serviceRates["meet-assist-base"]?.baseRate || 140;
          breakdown.push({ description: "Base Rate (2 hours, up to 2 passengers)", amount: basePrice });
        }

        // Apply festive period multiplier to base price if applicable
        if (isFestivePeriod) {
          const multiplier = extraCharges["festive-multiplier"]?.amount || 2;
          const festiveCharge = basePrice * (multiplier - 1);
          breakdown.push({ description: `Festive Period Surcharge (${multiplier}x base rate)`, amount: festiveCharge });
          basePrice = basePrice * multiplier;
        }

        // Additional hours charge
        const additionalHourRate = extraCharges["additional-hour"]?.amount || 0;
        const additionalHoursCharge = additionalHoursValue * additionalHourRate;
        if (additionalHoursValue > 0) {
          breakdown.push({ description: `Additional Hours (${additionalHoursValue} hours)`, amount: additionalHoursCharge });
          surcharges += additionalHoursCharge;
        }

        // Additional passengers charge
        if (passengers > 2) {
          const additionalPassengerRate = extraCharges["additional-passenger"]?.amount || 0;
          const additionalPassengers = passengers - 2;
          const additionalPassengersCharge = additionalPassengers * additionalPassengerRate;
          breakdown.push({ description: `Additional Passengers (${additionalPassengers})`, amount: additionalPassengersCharge });
          surcharges += additionalPassengersCharge;
        }

        // Buggy service
        if (wantBuggy) {
          const buggyRate = extraCharges["buggy-service"]?.amount || 0;
          breakdown.push({ description: "Buggy Service", amount: buggyRate });
          surcharges += buggyRate;
        }

        // Porter service
        if (wantPorter && bags) {
          const porterRate = extraCharges["porter-service"]?.amount || 0;
          const porterCount = Math.ceil(bags / 8);
          const porterCost = porterCount * porterRate;
          breakdown.push({ description: `Porter Service (${porterCount} porter${porterCount > 1 ? 's' : ''})`, amount: porterCost });
          surcharges += porterCost;
        }
        break;

      case "airportTransfer":
        if (pickupLocationId && dropoffLocationId) {
          const pickup = locations.find(l => l.id === pickupLocationId);
          const dropoff = locations.find(l => l.id === dropoffLocationId);
          
          if (pickup && dropoff) {
            const pickupAirport = pickup.name.split(" ")[0].toLowerCase();
            const dropoffAirport = dropoff.name.split(" ")[0].toLowerCase();
            
            // Both locations are in the same airport
            if (pickupAirport === dropoffAirport) {
              basePrice = serviceRates["airport-transfer-base"]?.baseRate || 100;
              breakdown.push({ description: "Base Rate (Same Airport)", amount: basePrice });
            }
            // Different airports
            else {
              basePrice = serviceRates["airport-transfer-connection"]?.baseRate || 150;
              breakdown.push({ description: "Base Rate (Different Airports)", amount: basePrice });
            }
          }
          // One location is Heathrow and other is custom
          else if ((pickup?.name.toLowerCase().includes("heathrow") || dropoff?.name.toLowerCase().includes("heathrow")) && 
                   (pickupLocationId === "other" || dropoffLocationId === "other")) {
            basePrice = serviceRates["airport-transfer-lhr"]?.baseRate || 120;
            breakdown.push({ description: "Base Rate (Heathrow to Custom Location)", amount: basePrice });
          }
          // One location is other airport and other is custom
          else if (pickupLocationId === "other" || dropoffLocationId === "other") {
            basePrice = serviceRates["airport-transfer-other"]?.baseRate || 130;
            breakdown.push({ description: "Base Rate (Airport to Custom Location)", amount: basePrice });
          }

          // Apply festive period multiplier to base price if applicable
          if (isFestivePeriod) {
            const multiplier = extraCharges["festive-multiplier"]?.amount || 2;
            const festiveCharge = basePrice * (multiplier - 1);
            breakdown.push({ description: `Festive Period Surcharge (${multiplier}x base rate)`, amount: festiveCharge });
            basePrice = basePrice * multiplier;
          }

          // Additional passengers charge
          if (passengers > 2) {
            const additionalPassengerRate = extraCharges["additional-passenger"]?.amount || 0;
            const additionalPassengers = passengers - 2;
            const additionalPassengersCharge = additionalPassengers * additionalPassengerRate;
            breakdown.push({ description: `Additional Passengers (${additionalPassengers})`, amount: additionalPassengersCharge });
            surcharges += additionalPassengersCharge;
          }

          // Additional hours charge
          const additionalHourRateAT = extraCharges["additional-hour"]?.amount || 0;
          const additionalHoursChargeAT = additionalHoursValue * additionalHourRateAT;
          if (additionalHoursValue > 0) {
            breakdown.push({ description: `Additional Hours (${additionalHoursValue} hours)`, amount: additionalHoursChargeAT });
            surcharges += additionalHoursChargeAT;
          }
        }
        break;

      case "hourlyHire":
        const selectedVehicle = vehicles.find(v => v.id === (formData?.vehicle || vehicle));
        if (selectedVehicle) {
          
          // Base price is always applied
          basePrice = selectedVehicle.basePrice;
          breakdown.push({ 
            description:selectedVehicle.name + " - Base Rate", 
            amount: basePrice 
          });

          // Additional hours charge
          if (additionalHoursValue > 0) {
            const additionalHoursCharge = additionalHoursValue * selectedVehicle.additionalHourlyRate;
            breakdown.push({ 
              description: `Additional Hours (${additionalHoursValue} hours)`, 
              amount: additionalHoursCharge 
            });
            surcharges += additionalHoursCharge;
          }

          // Apply festive period multiplier to base price if applicable
          if (isFestivePeriod) {
            const multiplier = extraCharges["festive-multiplier"]?.amount || 2;
            const festiveCharge = basePrice * (multiplier - 1);
            breakdown.push({ 
              description: `Festive Period Surcharge (${multiplier}x base rate)`, 
              amount: festiveCharge 
            });
            basePrice = basePrice * multiplier;
          }
        }
        break;
    }

    // Add subtotal before unsocial hours
    // const subtotalBeforeUnsocial = basePrice + surcharges;
    // breakdown.push({ description: "Subtotal (before unsocial hours)", amount: subtotalBeforeUnsocial });

    // Unsocial hours surcharge (applied after festive period but before VAT)
    if (isUnsocialHours) {
      const unsocialHoursRate = extraCharges["unsocial-hours"]?.amount || 0;
      breakdown.push({ description: "Unsocial Hours Surcharge", amount: unsocialHoursRate });
      surcharges += unsocialHoursRate;
    }

    // Calculate total before VAT
    const totalBeforeVat = basePrice + surcharges;
    breakdown.push({ description: "Total (before VAT)", amount: totalBeforeVat });

    // VAT calculation
    const vatRate = extraCharges["vat-rate"]?.amount/100 || 0.2;
    const vatAmount = totalBeforeVat * vatRate;
    breakdown.push({ description: `VAT (${(vatRate * 100).toFixed(0)}%)`, amount: vatAmount });

    // Final total
    const totalPrice = totalBeforeVat + vatAmount;
    setEstimatedPrice(totalPrice);
    setPriceBreakdown(breakdown);
    setShowModal(true);
  };

  const handleContinueToBooking = () => {
    const serviceDetails = {
      service_type: serviceType,
      service_subtype: serviceSubType,
      pickupLocationId,
      dropoffLocationId,
      customPickupAddress,
      customDropoffAddress,
      date: date?.toISOString(),
      hour,
      minute,
      passengers,
      wantBuggy,
      wantPorter,
      bags,
      flightNumberArrival,
      flightNumberDeparture,
      additionalHours,
      vehicle,
      estimatedPrice,
      priceBreakdown,
    };

    // Store service details in localStorage
    localStorage.setItem('serviceDetails', JSON.stringify(serviceDetails));
    
    // Navigate to booking page
    router.push('/booking');
  };

  const handleFindVehicles = () => {
    if (serviceType === "hourlyHire") {
      setShowVehicleSelection(true);
    } else {
      calculatePrice();
    }
  };

  const handleVehicleSelect = (selectedVehicle: Vehicle) => {
    setVehicle(selectedVehicle.id);
    setShowVehicleSelection(false);
    // Ensure we have all the necessary data before calculating price
    if (date && hour && minute && pickupLocationId) {
      // Update form data with the selected vehicle
      const updatedFormData = {
        date,
        hour,
        minute,
        passengers,
        additionalHours,
        pickupLocationId,
        customPickupAddress,
        vehicle: selectedVehicle.id
      };
      calculatePrice(updatedFormData);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-500">
        <AlertCircle className="h-5 w-5" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Price Estimator</CardTitle>
        <CardDescription>
          Calculate the estimated price for your journey
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
        {isPriceEstimationDisabled && (
          <div className="mb-4 p-4 bg-amber-100 text-amber-800 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{priceEstimationMessage}</span>
          </div>
        )}
        <Tabs 
          defaultValue="meetAndGreet" 
          onValueChange={(value) => setServiceType(value as "meetAndGreet" | "airportTransfer" | "hourlyHire")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-3">
            <TabsTrigger value="meetAndGreet" className="text-xs sm:text-sm">Meet & Greet</TabsTrigger>
            <TabsTrigger value="airportTransfer" className="text-xs sm:text-sm">Airport Transfer</TabsTrigger>
            <TabsTrigger value="hourlyHire" className="text-xs sm:text-sm">Hire by Hour</TabsTrigger>
          </TabsList>
          <TabsContent value="meetAndGreet">
            <JourneyForm
              type="meetAndGreet"
              locations={locations}
              onCalculate={calculatePrice}
              formData={{
                date,
                hour,
                minute,
                service_subtype: serviceSubType,
                passengers,
                wantBuggy,
                wantPorter,
                bags,
                flightNumberArrival,
                flightNumberDeparture,
                additionalHours,
                pickupLocationId,
                dropoffLocationId,
              }}
              setFormData={{
                setDate,
                setHour,
                setMinute,
                setServiceSubType,
                setPassengers,
                setWantBuggy,
                setWantPorter,
                setBags,
                setFlightNumberArrival,
                setFlightNumberDeparture,
                setAdditionalHours,
                setPickupLocationId,
                setDropoffLocationId,
              }}
              isLoading={isLocationsLoading}
            />
          </TabsContent>
          <TabsContent value="airportTransfer">
            <JourneyForm
              type="airportTransfer"
              locations={locations}
              onCalculate={calculatePrice}
              formData={{
                date,
                hour,
                minute,
                passengers,
                additionalHours,
                pickupLocationId,
                dropoffLocationId,
                customPickupAddress,
                customDropoffAddress,
              }}
              setFormData={{
                setDate,
                setHour,
                setMinute,
                setPassengers,
                setAdditionalHours,
                setPickupLocationId,
                setDropoffLocationId,
                setCustomPickupAddress,
                setCustomDropoffAddress,
              }}
              isLoading={isLocationsLoading}
            />
          </TabsContent>
          <TabsContent value="hourlyHire">
            {showVehicleSelection ? (
              <VehicleSelection
                vehicles={vehicles}
                onVehicleSelect={handleVehicleSelect}
                onBack={() => setShowVehicleSelection(false)}
                formData={{
                  date,
                  hour,
                  minute,
                  passengers,
                  additionalHours,
                  wantBuggy,
                  wantPorter,
                  bags,
                  pickupLocationId,
                  customPickupAddress,
                }}
                setFormData={{
                  setDate,
                  setHour,
                  setMinute,
                  setPassengers,
                  setAdditionalHours,
                  setWantBuggy,
                  setWantPorter,
                  setBags,
                  setPickupLocationId,
                  setCustomPickupAddress,
                }}
                isLoading={isLocationsLoading || isVehiclesLoading}
              />
            ) : (
              <JourneyForm
                type="hourlyHire"
                locations={locations}
                onCalculate={handleFindVehicles}
                formData={{
                  date,
                  hour,
                  minute,
                  passengers,
                  additionalHours,
                  pickupLocationId,
                  customPickupAddress,
                }}
                setFormData={{
                  setDate,
                  setHour,
                  setMinute,
                  setPassengers,
                  setAdditionalHours,
                  setPickupLocationId,
                  setCustomPickupAddress,
                }}
                isLoading={isLocationsLoading}
              />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <PriceModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onContinue={handleContinueToBooking}
        estimatedPrice={estimatedPrice}
        priceBreakdown={priceBreakdown}
      />
    </Card>
  );
}
