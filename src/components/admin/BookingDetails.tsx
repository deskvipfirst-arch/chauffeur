import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Booking, Driver } from "@/types/admin";

type BookingDetailsProps = {
  booking: Booking;
  drivers: Driver[];
  isEditing: boolean;
  editedBooking: Booking | null;
  setEditedBooking: (booking: Booking | null) => void;
  handleAssignDriver: (bookingId: string, value: string) => Promise<void>;
  handleMarkBookingCompleted: (bookingId: string) => Promise<void>;
  startEditing: (booking: Booking) => void;
  saveEditing: () => Promise<void>;
  cancelEditing: () => void;
  handleDeleteBooking: (bookingId: string) => Promise<void>;
};

export default function BookingDetails({
  booking,
  drivers,
  isEditing,
  editedBooking,
  setEditedBooking,
  handleAssignDriver,
  handleMarkBookingCompleted,
  startEditing,
  saveEditing,
  cancelEditing,
  handleDeleteBooking,
}: BookingDetailsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          {isEditing ? (
            <>
              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-600">
                  Full Name:
                </p>
                <Input
                  value={editedBooking?.full_name}
                  onChange={(e) =>
                    setEditedBooking(
                      editedBooking
                        ? { ...editedBooking, full_name: e.target.value }
                        : null
                    )
                  }
                  className="mt-1 bg-gray-50 border-gray-300"
                  aria-label="Full Name"
                  disabled={!isEditing}
                />
              </div>
              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-600">Email:</p>
                <Input
                  value={editedBooking?.email}
                  onChange={(e) =>
                    setEditedBooking(
                      editedBooking
                        ? { ...editedBooking, email: e.target.value }
                        : null
                    )
                  }
                  className="mt-1 bg-gray-50 border-gray-300"
                  aria-label="Email"
                />
              </div>
              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-600">Phone:</p>
                <Input
                  value={editedBooking?.phone || ""}
                  onChange={(e) =>
                    setEditedBooking(
                      editedBooking
                        ? {
                            ...editedBooking,
                            phone: e.target.value || undefined,
                          }
                        : null
                    )
                  }
                  className="mt-1 bg-gray-50 border-gray-300"
                  aria-label="Phone"
                />
              </div>
              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-600">
                  Pickup Location:
                </p>
                <Input
                  value={editedBooking?.pickup_location}
                  onChange={(e) =>
                    setEditedBooking(
                      editedBooking
                        ? { ...editedBooking, pickup_location: e.target.value }
                        : null
                    )
                  }
                  className="mt-1 bg-gray-50 border-gray-300"
                  aria-label="Pickup Location"
                />
              </div>
              {editedBooking?.dropoff_location && (
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-600">
                    Dropoff Location:
                  </p>
                  <Input
                    value={editedBooking?.dropoff_location || ""}
                    onChange={(e) =>
                      setEditedBooking(
                        editedBooking
                          ? {
                              ...editedBooking,
                              dropoff_location: e.target.value || null,
                            }
                          : null
                      )
                    }
                    className="mt-1 bg-gray-50 border-gray-300"
                    aria-label="Dropoff Location"
                  />
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-4">
                <span className="font-semibold">Email:</span> {booking.email}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                <span className="font-semibold">Phone:</span>{" "}
                {booking.phone || "N/A"}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                <span className="font-semibold">Service Type:</span>{" "}
                {booking.service_type.charAt(0).toUpperCase() +
                  booking.service_type.slice(1)}
              </p>
              {booking.service_subtype === "connection" ? (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    <span className="font-semibold">Departure Flight:</span>{" "}
                    {booking.departure_flight || "N/A"}
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    <span className="font-semibold">Arrival Flight:</span>{" "}
                    {booking.arrival_flight || "N/A"}
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-600 mb-4">
                  <span className="font-semibold">Flight Number:</span>{" "}
                  {booking.arrival_flight || "N/A"}
                </p>
              )}
              {booking.dropoff_location && (
                <p className="text-sm text-gray-600 mb-4">
                  <span className="font-semibold">Dropoff:</span>{" "}
                  {booking.dropoff_location}
                </p>
              )}
              <p className="text-sm text-gray-600 mb-4">
                <span className="font-semibold">Travel Date and Time:</span>{" "}
                {new Date(booking.date_time).toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                <span className="font-semibold">Passengers:</span>{" "}
                {booking.passengers}
              </p>
              {booking.additional_hours && booking.additional_hours > 0 && (
                <p className="text-sm text-gray-600 mb-4">
                  <span className="font-semibold">Additional Hours:</span>{" "}
                  {booking.additional_hours}
                </p>
              )}
              {booking.want_porter && (
                <p className="text-sm text-gray-600 mb-4">
                  <span className="font-semibold">Porter Service:</span> Yes
                  {booking.luggage && ` (${booking.luggage} bags)`}
                </p>
              )}
              {booking.want_buggy && (
                <p className="text-sm text-gray-600 mb-4">
                  <span className="font-semibold">Buggy Service:</span> Yes
                </p>
              )}
              <p className="text-sm text-gray-600 mb-4">
                <span className="font-semibold">Vehicle Selected:</span>{" "}
                {booking.selected_vehicle}
              </p>
            </>
          )}
        </div>
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-sm font-semibold text-gray-600">
              Assigned Driver:
            </span>
            {isEditing ? (
              <Select
                value={editedBooking?.driver_id || "unassign"}
                onValueChange={(value) =>
                  setEditedBooking(
                    editedBooking
                      ? {
                          ...editedBooking,
                          driver_id: value === "unassign" ? null : value,
                        }
                      : null
                  )
                }
              >
                <SelectTrigger className="w-[150px] bg-gray-50 border-gray-300">
                  <SelectValue placeholder="Assign Driver" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassign">Unassign</SelectItem>
                  {drivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select
                value={booking.driver_id || "unassign"}
                onValueChange={(value) => handleAssignDriver(booking.id, value)}
              >
                <SelectTrigger className="w-[150px] bg-gray-50 border-gray-300">
                  <SelectValue placeholder="Assign Driver" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassign">Unassign</SelectItem>
                  {drivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-4">
            <span className="font-semibold">Driver Status:</span>{" "}
            {booking.driver_status || "N/A"}
          </p>
          {booking.assigned_at && (
            <p className="text-sm text-gray-600 mb-2">
              <span className="font-semibold">Assigned At:</span> {new Date(booking.assigned_at).toLocaleString()}
            </p>
          )}
          {booking.accepted_at && (
            <p className="text-sm text-gray-600 mb-2">
              <span className="font-semibold">Accepted At:</span> {new Date(booking.accepted_at).toLocaleString()}
            </p>
          )}
          {booking.picked_up_at && (
            <p className="text-sm text-gray-600 mb-2">
              <span className="font-semibold">Picked Up At:</span> {new Date(booking.picked_up_at).toLocaleString()}
            </p>
          )}
          {booking.completed_at && (
            <p className="text-sm text-gray-600 mb-2">
              <span className="font-semibold">Completed At:</span> {new Date(booking.completed_at).toLocaleString()}
            </p>
          )}
          {!isEditing && booking.driver_id && booking.driver_status !== "completed" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleMarkBookingCompleted(booking.id)}
              className="mt-2 bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
            >
              Mark Completed
            </Button>
          )}
        </div>
      </div>
      <div className="flex space-x-2">
        {isEditing ? (
          <>
            <Button
              onClick={saveEditing}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Save
            </Button>
            <Button
              variant="outline"
              onClick={cancelEditing}
              className="border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={() => startEditing(booking)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Edit
            </Button>
            <Button
              onClick={() => handleDeleteBooking(booking.id)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
