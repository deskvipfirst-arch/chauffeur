"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Booking } from "@/types/admin";
import { toast } from "react-hot-toast";
import jsPDF from "jspdf";

type InvoicesTabProps = {
  bookings: Booking[];
  isLoadingBookings: boolean;
  bookingError: string | null;
};

export default function InvoicesTab({ bookings, isLoadingBookings, bookingError }: InvoicesTabProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentBookingId, setCurrentBookingId] = useState<string | null>(null);

  const handleGenerateInvoice = (booking: Booking) => {
    try {
      // Create a new PDF document
      const doc = new jsPDF();

      // Set font and add content
      doc.setFont("helvetica"); // Built-in font
      doc.setFontSize(20);
      doc.text("Invoice", 105, 20, { align: "center" });
      doc.setFontSize(12);
      doc.text(`Booking ID: ${booking.id}`, 105, 30, { align: "center" });
      doc.setFontSize(10);

      // Company Info
      doc.text("Luxury Car Booking Service", 20, 50);
      doc.text("123 Business St, City, Country", 20, 60);
      doc.text("Email: support@luxurycars.com", 20, 70);

      // Customer Info
      doc.setFontSize(12);
      doc.text("Bill To:", 20, 90);
      doc.setFontSize(10);
      doc.text(`Name: ${booking.full_name}`, 20, 100);
      doc.text(`Email: ${booking.email}`, 20, 110);
      doc.text(`Phone: ${booking.phone || "N/A"}`, 20, 120);

      // Booking Details
      doc.setFontSize(12);
      doc.text("Booking Details:", 20, 140);
      doc.setFontSize(10);
      doc.text(`Pickup: ${booking.pickup_location}`, 20, 160);
      doc.text(`Dropoff: ${booking.dropoff_location || "N/A"}`, 20, 170);
      doc.text(`Date/Time: ${new Date(booking.date_time).toLocaleString()}`, 20, 180);
      doc.text(`Car: ${booking.selected_vehicle}`, 20, 190);
      doc.text(`Amount: £${booking.amount.toFixed(2)}`, 20, 200);
      doc.text(`Status: ${booking.status}`, 20, 210);

      // Footer
      doc.setFontSize(10);
      doc.text("Thank you for your business!", 105, 250, { align: "center" });

      // Generate Blob URL for preview
      const pdfBlob = doc.output("blob");
      const pdfUrl = URL.createObjectURL(pdfBlob);
      setPreviewUrl(pdfUrl);
      setCurrentBookingId(booking.id);

      toast.success("Invoice preview generated successfully!");
    } catch (error) {
      console.error("Error generating invoice preview:", error);
      toast.error("Failed to generate invoice preview. Please try again.");
    }
  };

  const handleDownload = () => {
    if (!previewUrl || !currentBookingId) return;

    const link = document.createElement("a");
    link.href = previewUrl;
    link.download = `invoice-${currentBookingId}.pdf`;
    link.click();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Generate Invoices</h2>

      {isLoadingBookings ? (
        <p className="text-center">Loading bookings...</p>
      ) : bookingError ? (
        <p className="text-red-500 text-center">{bookingError}</p>
      ) : bookings.length === 0 ? (
        <p className="text-center">No bookings found.</p>
      ) : (
        <div className="bg-white p-4 rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-2 text-left">ID</th>
                <th className="p-2 text-left">Created At</th>
                <th className="p-2 text-left">Full Name</th>
                <th className="p-2 text-left">Email</th>
                <th className="p-2 text-left">Amount</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id} className="border-b">
                  <td className="p-2">{booking.id.slice(0, 8)}...</td>
                  <td className="p-2">{new Date(booking.created_at).toLocaleString()}</td>
                  <td className="p-2">{booking.full_name}</td>
                  <td className="p-2">{booking.email}</td>
                  <td className="p-2">£{booking.amount.toFixed(2)}</td>
                  <td className="p-2">{booking.status}</td>
                  <td className="p-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerateInvoice(booking)}
                    >
                      Preview Invoice
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {previewUrl && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">Invoice Preview</h3>
            <button
              onClick={handleDownload}
              className="text-blue-500 hover:text-blue-700"
              title="Download Invoice"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M16 12l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            </button>
          </div>
          <iframe
            src={previewUrl}
            className="w-full h-[500px] border rounded-lg"
            title="Invoice Preview"
          />
        </div>
      )}
    </div>
  );
}