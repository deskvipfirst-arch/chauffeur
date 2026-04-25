import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Booking, Driver } from "@/types/admin";
import BookingDetails from "./BookingDetails";

type MobileBookingCardProps = {
  booking: Booking;
  drivers: Driver[];
  handleUpdateBookingStatus: (bookingId: string, newStatus: string) => Promise<void>;
  handleAssignDriver: (bookingId: string, value: string) => Promise<void>;
  handleMarkBookingCompleted: (bookingId: string) => Promise<void>;
  handleDeleteBooking: (bookingId: string) => Promise<void>;
};

export default function MobileBookingCard({
  booking,
  drivers,
  handleUpdateBookingStatus,
  handleAssignDriver,
  handleMarkBookingCompleted,
  handleDeleteBooking,
}: MobileBookingCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedBooking, setEditedBooking] = useState<Booking | null>(null);

  const toggleCard = () => {
    setIsExpanded((prev) => !prev);
  };

  const startEditing = (currentBooking: Booking) => {
    setIsEditing(true);
    setEditedBooking({ ...currentBooking });
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditedBooking(null);
  };

  const saveEditing = async () => {
    setIsEditing(false);
    setEditedBooking(null);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Booking Ref</p>
            <p className="break-words text-sm font-semibold text-gray-900">{booking.booking_ref}</p>
          </div>
          <button
            onClick={toggleCard}
            className="shrink-0 rounded-full p-2 transition-colors duration-200 hover:bg-gray-100"
            aria-expanded={isExpanded}
            aria-controls={`mobile-details-${booking.id}`}
          >
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-600" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-600" />
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Created</p>
            <p className="text-sm text-gray-900">{new Date(booking.created_at).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Passenger</p>
            <p className="break-words text-sm text-gray-900">{booking.full_name}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Pickup</p>
            <p className="break-words text-sm text-gray-900">{booking.pickup_location}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Amount</p>
            <p className="text-sm font-semibold text-gray-900">£{booking.amount.toFixed(2)}</p>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Status</p>
            {isEditing && editedBooking ? (
              <Select
                value={editedBooking.status}
                onValueChange={(value) =>
                  setEditedBooking({ ...editedBooking, status: value })
                }
              >
                <SelectTrigger className="w-full bg-gray-50 border-gray-300">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="picked_up">Picked Up</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Select
                value={booking.status}
                onValueChange={(value) => handleUpdateBookingStatus(booking.id, value)}
              >
                <SelectTrigger className="w-full bg-gray-50 border-gray-300">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="picked_up">Picked Up</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-4" id={`mobile-details-${booking.id}`}>
          <BookingDetails
            booking={booking}
            drivers={drivers}
            isEditing={isEditing}
            editedBooking={editedBooking}
            setEditedBooking={setEditedBooking}
            handleAssignDriver={handleAssignDriver}
            handleMarkBookingCompleted={handleMarkBookingCompleted}
            startEditing={startEditing}
            saveEditing={saveEditing}
            cancelEditing={cancelEditing}
            handleDeleteBooking={handleDeleteBooking}
          />
        </div>
      )}
    </div>
  );
}