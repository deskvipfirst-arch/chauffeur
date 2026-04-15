import { NextResponse } from "next/server";
import nodemailer from "nodemailer"
// import twilio from "twilio";

export async function POST(req: Request) {
  try {
    const { firstName, lastName, email, phone, subject, message } = await req.json();

    // Email Configuration (Nodemailer)
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.CONTACT_EMAIL, // Your business email
      subject: `New Contact Form Submission on LCH: ${subject}`,
      text: `You have a new message from ${firstName} ${lastName} (${email}, ${phone}):\n\n${message}`,
    };

    await transporter.sendMail(mailOptions);

    // SMS Configuration (Twilio)
    // const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
    // await twilioClient.messages.create({
    //   body: `New inquiry from ${firstName} ${lastName}: ${message}`,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   to: process.env.NOTIFICATION_PHONE_NUMBER, // Your phone number
    // });

    return NextResponse.json({ success: true, message: "Message sent successfully" });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json({ success: false, message: "Message failed to send" }, { status: 500 });
  }
}
