"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "@/lib/supabase-db";
import { db } from "@/lib/supabase";
import { Booking } from "@/types/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";

export default function EditBookingPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const bookingDoc = await getDoc(doc(db, "bookings", params.id));
        if (bookingDoc.exists()) {
          const bookingData = bookingDoc.data() as Booking;
          setBooking(bookingData);
          const bookingDate = new Date(bookingData.date_time);
          setDate(format(bookingDate, "yyyy-MM-dd"));
          setTime(format(bookingDate, "HH:mm"));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;

    try {
      const dateTime = new Date(`${date}T${time}`);
      const {
        id: _id,
        created_at: _createdAt,
        createdAt: _createdAtCamel,
        updated_at: _updatedAt,
        updatedAt: _updatedAtCamel,
        ...editableBooking
      } = booking as any;

      await updateDoc(doc(db, "bookings", params.id), {
        ...editableBooking,
        date_time: dateTime.toISOString(),
      });
      toast.success("Booking updated successfully");
      router.push("/user/dashboard");
    } catch (error) {
      console.error("Error updating booking:", error);
      toast.error("Failed to update booking");
    }
  };

  if (isLoading) return <div className="p-4 sm:p-6">Loading...</div>;
  if (!booking) return <div className="p-4 sm:p-6">Booking not found</div>;

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      <Card>
        <CardHeader>
          <CardTitle>Edit Booking</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {booking.service_type !== "hourlyHire" && (
                <div className="space-y-2">
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-600">
                      Service Type:
                    </p>
                    <Select
                      value={booking.service_type}
                      onValueChange={(value) =>
                        setBooking({
                          ...booking,
                          service_type: value as
                            | "hourlyHire"
                            | "meetAndGreet"
                            | "airportTransfer",
                        })
                      }
                    >
                      <SelectTrigger className="w-full bg-gray-50 border-gray-300">
                        <SelectValue placeholder="Meet and Assist Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="arrival">Arrival</SelectItem>
                        <SelectItem value="departure">Departure</SelectItem>
                        <SelectItem value="connection">Connection</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {booking.service_type !== "hourlyHire" && (
                <>
                  {booking.service_subtype === "connection" ? (
                    <>
                      <div className="space-y-2">
                        <Label>Departure Flight</Label>
                        <Input
                          value={booking.departure_flight || ""}
                          onChange={(e) =>
                            setBooking({
                              ...booking,
                              departure_flight: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Arrival Flight</Label>
                        <Input
                          value={booking.arrival_flight || ""}
                          onChange={(e) =>
                            setBooking({
                              ...booking,
                              arrival_flight: e.target.value,
                            })
                          }
                        />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <Label>Flight Number</Label>
                      <Input
                        value={booking.service_subtype === "arrival" 
                          ? (booking.arrival_flight || "") 
                          : (booking.departure_flight || "")}
                        onChange={(e) =>
                          setBooking({
                            ...booking,
                            [booking.service_subtype === "arrival" ? "arrival_flight" : "departure_flight"]: e.target.value || null,
                          })
                        }
                      />
                    </div>
                  )}
                </>
              )}

              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Passengers</Label>
                <Input
                  type="number"
                  min="1"
                  value={booking.passengers}
                  onChange={(e) =>
                    setBooking({
                      ...booking,
                      passengers: parseInt(e.target.value),
                    })
                  }
                />
              </div>
              {booking.service_type === "hourlyHire" && (
                <div className="space-y-2">
                  <Label>Additional Hours</Label>
                  <Input
                    type="number"
                    min="0"
                    value={booking.additional_hours || 0}
                    onChange={(e) =>
                      setBooking({
                        ...booking,
                        additional_hours: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
              )}
              {booking.service_type !== "hourlyHire" && (
                <>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={booking.want_buggy || false}
                      onCheckedChange={(checked: boolean) =>
                        setBooking({ ...booking, want_buggy: checked })
                      }
                    />
                    <Label>Buggy Service</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={booking.want_porter || false}
                      onCheckedChange={(checked: boolean) =>
                        setBooking({ ...booking, want_porter: checked })
                      }
                    />
                    <Label>Porter Service</Label>
                  </div>
                  <div className="space-y-2">
                    <Label>Number of Bags/Luggage</Label>
                    <Input
                      type="number"
                      min="1"
                      value={booking.luggage || 1}
                      onChange={(e) =>
                        setBooking({
                          ...booking,
                          luggage: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                </>
              )}
            </div>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:space-x-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/user/dashboard")}
              >
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
