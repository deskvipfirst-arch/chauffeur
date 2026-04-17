import { useState } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Booking, Driver } from "@/types/admin";
import BookingDetails from "./BookingDetails";

type BookingRowProps = {
  booking: Booking;
  drivers: Driver[];
  handleUpdateBookingStatus: (bookingId: string, newStatus: string) => Promise<void>;
  handleAssignDriver: (bookingId: string, value: string) => Promise<void>;
  handleMarkBookingCompleted: (bookingId: string) => Promise<void>;
  handleDeleteBooking: (bookingId: string) => Promise<void>;
};

export default function BookingRow({
  booking,
  drivers,
  handleUpdateBookingStatus,
  handleAssignDriver,
  handleMarkBookingCompleted,
  handleDeleteBooking,
}: BookingRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedBooking, setEditedBooking] = useState<Booking | null>(null);

  const toggleRow = () => {
    setIsExpanded((prev) => !prev);
  };

  const startEditing = (booking: Booking) => {
    setIsEditing(true);
    setEditedBooking({ ...booking });
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
    <>
      <tr
        key={`main-${booking.id}`}
        className="border-b hover:bg-gray-50 transition-colors duration-200"
      >
        <td className="p-4">{booking.booking_ref}</td>
        <td className="p-4">{new Date(booking.created_at).toLocaleString()}</td>
        <td className="p-4">{booking.full_name}</td>
        <td className="p-4">{booking.pickup_location}</td>
        <td className="p-4">£{booking.amount.toFixed(2)}</td>
        <td className="p-4 flex items-center justify-between">
          {isEditing && editedBooking ? (
            <Select
              value={editedBooking.status}
              onValueChange={(value) =>
                setEditedBooking({ ...editedBooking, status: value })
              }
            >
              <SelectTrigger className="w-[120px] bg-gray-50 border-gray-300">
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
              <SelectTrigger className="w-[120px] bg-gray-50 border-gray-300">
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
          <button
            onClick={toggleRow}
            className="p-2 rounded-full hover:bg-gray-200 transition-colors duration-200"
            aria-expanded={isExpanded}
            aria-controls={`details-${booking.id}`}
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </td>
      </tr>
      {isExpanded && (
        <tr key={`details-${booking.id}`} className="bg-gray-50">
          <td colSpan={6} className="p-6" id={`details-${booking.id}`}>
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
          </td>
        </tr>
      )}
    </>
  );
}