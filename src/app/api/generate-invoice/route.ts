import { NextResponse } from "next/server";
import jsPDF from "jspdf";
import { CONTACT_EMAIL } from "@/lib/globalConfig";

export async function POST(req: Request) {
  try {
    const { booking } = await req.json();

    if (!booking) {
      return NextResponse.json({ error: "Booking data is required" }, { status: 400 });
    }

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
    doc.text(`Email: ${CONTACT_EMAIL}`, 20, 70);

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
    doc.text(`Service Type: ${booking.is_hire_by_hour ? "Hire By Hour" : "One Way"}`, 20, 150);
    doc.text(`Pickup: ${booking.pickup_location}`, 20, 160);
    doc.text(`Dropoff: ${booking.dropoff_location || "N/A"}`, 20, 170);
    doc.text(`Date/Time: ${new Date(booking.date_time).toLocaleString()}`, 20, 180);
    doc.text(`Car: ${booking.selected_car}`, 20, 190);
    doc.text(`Amount: £${booking.amount.toFixed(2)}`, 20, 200);
    doc.text(`Status: ${booking.status}`, 20, 210);
    if (booking.is_hire_by_hour) {
      doc.text(`Duration: ${booking.duration} ${booking.duration_unit}`, 20, 220);
    }

    // Footer
    doc.setFontSize(10);
    doc.text("Thank you for your business!", 105, 250, { align: "center" });

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    // Return the PDF as a response
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=invoice-${booking.id}.pdf`,
      },
    });
  } catch (error) {
    console.error("Error generating invoice:", error);
    return NextResponse.json({ error: "Failed to generate invoice" }, { status: 500 });
  }
}
