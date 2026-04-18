import { NextResponse } from "next/server";
import {
  buildContactNotificationEmail,
  canSendTransactionalEmail,
  sendTransactionalEmail,
} from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { firstName, lastName, email, phone, subject, message } = await req.json();

    if (!firstName || !lastName || !email || !message) {
      return NextResponse.json(
        { success: false, message: "Please complete the required contact fields." },
        { status: 400 }
      );
    }

    if (!canSendTransactionalEmail()) {
      return NextResponse.json(
        {
          success: false,
          message: "Email delivery is not configured yet. Please add the Resend settings to enable contact messages.",
        },
        { status: 503 }
      );
    }

    const destination = process.env.CONTACT_EMAIL || process.env.BOOKING_NOTIFICATION_EMAIL;
    if (!destination) {
      return NextResponse.json(
        { success: false, message: "Business contact email is not configured yet." },
        { status: 503 }
      );
    }

    const emailContent = buildContactNotificationEmail({
      firstName,
      lastName,
      email,
      phone,
      subject,
      message,
    });

    await sendTransactionalEmail({
      to: destination,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
      replyTo: email,
    });

    return NextResponse.json({ success: true, message: "Message sent successfully." });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { success: false, message: "Message failed to send." },
      { status: 500 }
    );
  }
}
