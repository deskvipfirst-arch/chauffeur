import { NextResponse } from "next/server";
import {
  buildContactNotificationEmail,
  canSendTransactionalEmail,
  getOfficeNotificationRecipients,
  sendTransactionalEmail,
} from "@/lib/email";
import { getOfficeNotificationEmailSetting } from "@/lib/supabase/admin";

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

    const storedOfficeEmail = await getOfficeNotificationEmailSetting();
    const destinations = getOfficeNotificationRecipients({ bookingNotificationEmail: storedOfficeEmail ?? undefined });
    if (destinations.length === 0) {
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
      to: destinations,
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
