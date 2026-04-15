import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { CalendarIcon, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Location, Vehicle } from "@/lib/types";
import { getFestivePeriods } from "../festive-periods";
import { isWithinInterval, startOfDay } from "date-fns";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import React, { forwardRef } from "react";

interface JourneyFormProps {
  type: "meetAndGreet" | "airportTransfer" | "hourlyHire";
  locations: Location[];
  vehicles?: Vehicle[];
  onCalculate: (e?: React.FormEvent) => void;
  submitButtonText?: string;
  isLoading?: boolean;
  formData: {
    date: Date | undefined;
    hour: string;
    minute: string;
    service_subtype?: "arrival" | "departure" | "connection" | null;
    passengers: number;
    wantBuggy?: boolean;
    wantPorter?: boolean;
    bags?: number;
    flightNumberArrival?: string;
    flightNumberDeparture?: string;
    additionalHours: number;
    vehicle?: string;
    pickupLocationId?: string;
    dropoffLocationId?: string;
    customPickupAddress?: string;
    customDropoffAddress?: string;
  };
  setFormData: {
    setDate: (date: Date | undefined) => void;
    setHour: (hour: string) => void;
    setMinute: (minute: string) => void;
    setServiceSubType?: (
      type: "arrival" | "departure" | "connection" 
    ) => void;
    setPassengers: (passengers: number) => void;
    setWantBuggy?: (want: boolean) => void;
    setWantPorter?: (want: boolean) => void;
    setBags?: (bags: number) => void;
    setFlightNumberArrival?: (flight: string) => void;
    setFlightNumberDeparture?: (flight: string) => void;
    setAdditionalHours: (hours: number) => void;
    setVehicle?: (vehicle: string) => void;
    setPickupLocationId?: (id: string) => void;
    setDropoffLocationId?: (id: string) => void;
    setCustomPickupAddress?: (address: string) => void;
    setCustomDropoffAddress?: (address: string) => void;
  };
}

// Custom input for DatePicker with icon inside
const DateInputWithIcon = forwardRef<HTMLInputElement, any>(
  ({ value, onClick, onChange, placeholder, disabled }, ref) => (
    <div className="relative w-full">
      <input
        ref={ref}
        value={value}
        onClick={onClick}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        readOnly
        className="w-full pr-10 pl-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white cursor-pointer"
      />
      <span
        className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
        onClick={onClick}
        tabIndex={-1}
      >
        <CalendarIcon className="h-5 w-5 text-muted-foreground" />
      </span>
    </div>
  )
);
DateInputWithIcon.displayName = "DateInputWithIcon";

export default function JourneyForm({
  type,
  locations,
  vehicles,
  onCalculate,
  formData,
  setFormData,
  submitButtonText = "Calculate Estimate",
  isLoading = false,
}: JourneyFormProps) {
  const MAX_PASSENGERS = 8;
  const MAX_ADDITIONAL_HOURS = 12;

  const currentYear = new Date().getFullYear();
  const FESTIVE_PERIODS = getFestivePeriods(currentYear);

  const isFestivePeriod = (() => {
    if (!formData.date) return false;
    const selectedDate = new Date(formData.date);
    return FESTIVE_PERIODS.some((period) =>
      isWithinInterval(startOfDay(selectedDate), {
        start: startOfDay(new Date(period.start)),
        end: startOfDay(new Date(period.end)),
      })
    );
  })();

  const [locationError, setLocationError] = useState("");
  const [isPriceEstimationDisabled, setIsPriceEstimationDisabled] = useState(false);
  const [priceEstimationMessage, setPriceEstimationMessage] = useState("");

  // Add useEffect to handle price estimation disable logic
  useEffect(() => {
    if (type === "meetAndGreet" && formData.service_subtype === "connection" && formData.pickupLocationId && formData.dropoffLocationId) {
      const pickup = locations.find(l => l.id === formData.pickupLocationId);
      const dropoff = locations.find(l => l.id === formData.dropoffLocationId);
      
      if (pickup && dropoff) {
        const pickupAirport = pickup.name.split(" ")[0].toLowerCase();
        const dropoffAirport = dropoff.name.split(" ")[0].toLowerCase();

        // If different airports
        if (pickupAirport !== dropoffAirport) {
          setIsPriceEstimationDisabled(true);
          setPriceEstimationMessage("For connections between different airports, please select 'Airport Transfer' as the service type.");
          return;
        }

        // If same airport but different terminals at non-Heathrow
        const isHeathrow = (name: string) => name.toLowerCase().includes("heathrow");
        if (!isHeathrow(pickup.name) && pickup.name !== dropoff.name) {
          setIsPriceEstimationDisabled(true);
          setPriceEstimationMessage("Connection service between different terminals is only available at Heathrow airport.");
          return;
        }
      }
    }

    // Check for both locations being "Other" in airport transfer
    if (type === "airportTransfer" && formData.pickupLocationId === "other" && formData.dropoffLocationId === "other") {
      setIsPriceEstimationDisabled(true);
      setPriceEstimationMessage("Please choose 'Hire by hour' service for custom address to custom address transfers.");
      return;
    }

    // Reset states if no conditions are met
    setIsPriceEstimationDisabled(false);
    setPriceEstimationMessage("");
  }, [type, formData.service_subtype, formData.pickupLocationId, formData.dropoffLocationId, locations]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setLocationError("");
        if (!formData.pickupLocationId || formData.pickupLocationId === "") {
          setLocationError("Please select a pickup location.");
          return;
        }
        if (type === "airportTransfer" && (!formData.dropoffLocationId || formData.dropoffLocationId === "")) {
          setLocationError("Please select a dropoff location.");
          return;
        }
        if (isPriceEstimationDisabled) {
          setLocationError(priceEstimationMessage);
          return;
        }
        onCalculate();
      }}
      className="space-y-8"
    >
      <div className="grid gap-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Pickup Location */}
          <div className="w-full sm:w-[240px] space-y-3">
            <Label>Pickup Location</Label>
            <Select
              value={formData.pickupLocationId || ""}
              onValueChange={(value) => {
                if (setFormData.setPickupLocationId) {
                  setFormData.setPickupLocationId(value);
                }
                if (value) {
                  setLocationError("");
                }
                // Reset custom address when location changes
                if (setFormData.setCustomPickupAddress) {
                  setFormData.setCustomPickupAddress("");
                }
              }}
              disabled={isLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
                {type !== "meetAndGreet" && <SelectItem value="other">Other</SelectItem>}
              </SelectContent>
            </Select>
            {formData.pickupLocationId === "other" && setFormData.setCustomPickupAddress && (
              <Input
                className="mt-2"
                placeholder="Enter custom pickup address"
                value={formData.customPickupAddress}
                onChange={(e) => setFormData.setCustomPickupAddress?.(e.target.value)}
              />
            )}
            {locationError && !formData.pickupLocationId && (
              <p className="text-xs text-red-500 mt-1">{locationError}</p>
            )}
          </div>

          {/* Meet & Greet Type */}
          {formData.service_subtype && setFormData.setServiceSubType && (
            <div className="w-full sm:w-[240px] space-y-3">
              <Label>Meet & Greet Type</Label>
              <Select
                value={formData.service_subtype}
                onValueChange={value => setFormData.setServiceSubType?.(value as "arrival" | "departure" | "connection")}
                disabled={isLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="arrival">Arrival</SelectItem>
                  <SelectItem value="departure">Departure</SelectItem>
                  <SelectItem value="connection">Connection</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Dropoff Location for Airport Transfer */}
          {type === "airportTransfer" && setFormData.setDropoffLocationId && (
            <div className="w-full sm:w-[240px] space-y-3">
              <Label>Dropoff Location</Label>
              <Select
                value={formData.dropoffLocationId || ""}
                onValueChange={(value) => {
                  if (setFormData.setDropoffLocationId) {
                    setFormData.setDropoffLocationId(value);
                  }
                  if (value) {
                    setLocationError("");
                  }
                  // Reset custom address when location changes
                  if (setFormData.setCustomDropoffAddress) {
                    setFormData.setCustomDropoffAddress("");
                  }
                }}
                disabled={isLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {formData.dropoffLocationId === "other" && setFormData.setCustomDropoffAddress && (
                <Input
                  className="mt-2"
                  placeholder="Enter custom dropoff address"
                  value={formData.customDropoffAddress}
                  onChange={(e) => setFormData.setCustomDropoffAddress?.(e.target.value)}
                />
              )}
              {locationError && type === "airportTransfer" && !formData.dropoffLocationId && (
                <p className="text-xs text-red-500 mt-1">{locationError}</p>
              )}
            </div>
          )}

          {formData.service_subtype === "connection" && setFormData.setDropoffLocationId && (
            <div className="w-full sm:w-[240px] space-y-3">
              <Label>Dropoff Location</Label>
              <Select
                value={formData.dropoffLocationId || ""}
                onValueChange={setFormData.setDropoffLocationId}
                disabled={isLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Dropoff Location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {formData.service_subtype === "connection" && formData.pickupLocationId && formData.dropoffLocationId && (
          (() => {
            const pickup = locations.find(l => l.id === formData.pickupLocationId);
            const dropoff = locations.find(l => l.id === formData.dropoffLocationId);
            if (!pickup || !dropoff) return null;

            const pickupAirport = pickup.name.split(" ")[0].toLowerCase();
            const dropoffAirport = dropoff.name.split(" ")[0].toLowerCase();

            // If different airports, suggest airport transfer
            if (pickupAirport !== dropoffAirport) {
              return (
                <div className="p-3 bg-amber-100 text-amber-800 rounded-md mt-2">
                  <p className="text-xs">For connections between different airports, please select 'Airport Transfer' as the service type.</p>
                </div>
              );
            }

            // If same airport but different terminals at non-Heathrow
            const isHeathrow = (name: string) => name.toLowerCase().includes("heathrow");
            if (!isHeathrow(pickup.name) && pickup.name !== dropoff.name) {
              return (
                <div className="p-3 bg-amber-100 text-amber-800 rounded-md mt-2">
                  <p className="text-xs">Connection service between different terminals is only available at Heathrow airport.</p>
                </div>
              );
            }

            return null;
          })()
        )}

        {/* Check for both locations being "Other" in airport transfer */}
        {type === "airportTransfer" && formData.pickupLocationId === "other" && formData.dropoffLocationId === "other" && (
          <div className="p-3 bg-amber-100 text-amber-800 rounded-md mt-2">
            <p className="text-xs">Please choose 'Hire by hour' service for custom address to custom address transfers.</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Date */}
          <div className="w-full sm:w-[240px] space-y-3">
            <Label>Date</Label>
            <DatePicker
              selected={formData.date}
              onChange={(date: Date | null) =>
                setFormData.setDate(date || undefined)
              }
              dateFormat="PPP"
              minDate={new Date()}
              disabled={isLoading}
              placeholderText="Pick a date"
              customInput={
                <DateInputWithIcon />
              }
            />
            {isFestivePeriod && (
              <div className="p-3 bg-amber-100 text-amber-800 rounded-md">
                <p className="text-xs">
                  Price will be double during festive periods.
                </p>
              </div>
            )}
          </div>

          {/* Time */}
          <div className="w-full sm:w-[240px] space-y-3">
            <Label>Time</Label>
            <div className="relative">
              <input
                type="time"
                value={`${formData.hour}:${formData.minute}`}
                onChange={(e) => {
                  const [hours, minutes] = e.target.value.split(":");
                  setFormData.setHour(hours);
                  setFormData.setMinute(minutes);
                }}
                disabled={isLoading}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            {formData.hour &&
              (parseInt(formData.hour) >= 22 ||
                parseInt(formData.hour) < 6) && (
                <div className="p-3 bg-amber-100 text-amber-800 rounded-md">
                  <p className="text-xs">
                    Extra charge of GBP 60 will be applied during 10 PM - 6 AM.
                  </p>
                </div>
              )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Passengers */}
          <div className="space-y-3">
            <Label>Number of Passengers</Label>
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() =>
                  setFormData.setPassengers(
                    Math.max(1, formData.passengers - 1)
                  )
                }
                disabled={isLoading || formData.passengers <= 1}
                className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center">{formData.passengers}</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() =>
                  setFormData.setPassengers(
                    Math.min(MAX_PASSENGERS, formData.passengers + 1)
                  )
                }
                disabled={isLoading || formData.passengers >= MAX_PASSENGERS}
                className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Additional Hours */}
          <div className="space-y-3">
            <Label>Additional Hours</Label>
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() =>
                  setFormData.setAdditionalHours(
                    Math.max(0, formData.additionalHours - 1)
                  )
                }
                disabled={isLoading || formData.additionalHours <= 0}
                className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center">
                {formData.additionalHours}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() =>
                  setFormData.setAdditionalHours(
                    Math.min(MAX_ADDITIONAL_HOURS, formData.additionalHours + 1)
                  )
                }
                disabled={
                  isLoading || formData.additionalHours >= MAX_ADDITIONAL_HOURS
                }
                className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Combined Warnings Row */}
        {(formData.additionalHours > 0 || formData.passengers > 2) && (
          <div className="flex gap-4 mt-2">
            {formData.additionalHours > 0 && type !== "hourlyHire" && (
              <div className="p-3 bg-amber-100 text-amber-800 rounded-md flex-1">
                <p className="text-xs">
                  Additional hours (over 2) will be charged at the hourly rate
                </p>
              </div>
            )}
            {formData.passengers > 2 && type !== "hourlyHire" && (
              <div className="p-3 bg-amber-100 text-amber-800 rounded-md flex-1">
                <p className="text-xs">
                  Additional charge per passenger will be applied for more than 2 passengers
                </p>
              </div>
            )}
          </div>
        )}

        {/* Update the warning message for additional hours based on service type */}
        {type === "hourlyHire" && formData.additionalHours > 0 && (
          <div className="p-3 bg-amber-100 text-amber-800 rounded-md mt-2">
            <p className="text-xs">
              Standard hire duration is 10 hours. Additional hours will be charged at the hourly rate.
            </p>
          </div>
        )}

        {/* Vehicle Selection for Hire by Hour */}
        {type === "hourlyHire" && vehicles && setFormData.setVehicle && (
          <div className="space-y-3">
            <Label>Select Vehicle</Label>
            <Select
              value={formData.vehicle}
              onValueChange={setFormData.setVehicle}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a vehicle" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Additional Services */}
        {type === "meetAndGreet" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Buggy Service */}
              <div className="space-y-3">
                <Label>Want Buggy Service?</Label>
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setFormData.setWantBuggy?.(true)}
                    disabled={isLoading}
                    className={cn(
                      "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
                      !formData.wantBuggy && "bg-transparent text-foreground"
                    )}
                  >
                    Yes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setFormData.setWantBuggy?.(false)}
                    disabled={isLoading}
                    className={cn(
                      "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
                      formData.wantBuggy && "bg-transparent text-foreground"
                    )}
                  >
                    No
                  </Button>
                </div>
                {formData.wantBuggy && (
                  <div className="p-3 bg-amber-100 text-amber-800 rounded-md">
                    <p className="text-xs">
                      Buggy service is subject to availability and will be
                      confirmed upon booking
                    </p>
                  </div>
                )}
              </div>

              {/* Porter Service */}
              <div className="space-y-3">
                <Label>Want Porter Service?</Label>
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setFormData.setWantPorter?.(true)}
                    disabled={isLoading}
                    className={cn(
                      "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
                      !formData.wantPorter && "bg-transparent text-foreground"
                    )}
                  >
                    Yes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setFormData.setWantPorter?.(false)}
                    disabled={isLoading}
                    className={cn(
                      "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
                      formData.wantPorter && "bg-transparent text-foreground"
                    )}
                  >
                    No
                  </Button>
                </div>
                {formData.wantPorter && (
                  <div className="p-3 bg-amber-100 text-amber-800 rounded-md">
                    <p className="text-xs">
                      Porter service is subject to availability and will be
                      confirmed upon booking
                    </p>
                  </div>
                )}
              </div>
            </div>

            {formData.wantPorter && setFormData.setBags && (
              <div className="space-y-3">
                <Label>Number of Bags</Label>
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (setFormData.setBags) {
                        setFormData.setBags(
                          Math.max(0, (formData.bags || 0) - 1)
                        );
                      }
                    }}
                    disabled={isLoading || (formData.bags || 0) <= 0}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center">
                    {formData.bags !== undefined ? formData.bags : ""}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (setFormData.setBags) {
                        setFormData.setBags((formData.bags || 0) + 1);
                      }
                    }}
                    disabled={isLoading}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.bags !== undefined && formData.bags > 8 && (
                  <div className="p-3 bg-amber-100 text-amber-800 rounded-md">
                    <p className="text-xs">
                      {Math.ceil(formData.bags / 8)} porter
                      {Math.ceil(formData.bags / 8) > 1 ? "s" : ""} will be
                      required. Additional charge of £65 per porter will be
                      added.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <Button
        type="submit"
        className="w-full float-end sm:w-auto"
        disabled={isLoading || isPriceEstimationDisabled}
      >
        {submitButtonText}
      </Button>
    </form>
  );
}
