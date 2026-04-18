import { NextResponse } from "next/server";
import {
  buildOperationalTestEmail,
  getTransactionalEmailConfigSummary,
  sendTransactionalEmail,
} from "@/lib/email";
import { requireAuthorizedUser } from "@/lib/supabase-admin";

export const runtime = "nodejs";

function getStatusCode(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";

  if (message === "Missing authorization token" || message === "Invalid authorization token") {
    return 401;
  }

  if (message === "Forbidden") {
    return 403;
  }

  return 500;
}

export async function GET(request: Request) {
  try {
    await requireAuthorizedUser(request.headers.get("authorization"), ["admin"]);

    return NextResponse.json({
      success: true,
      email: getTransactionalEmailConfigSummary(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load email status",
      },
      { status: getStatusCode(error) }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuthorizedUser(request.headers.get("authorization"), ["admin"]);
    const summary = getTransactionalEmailConfigSummary();

    if (!summary.configured) {
      return NextResponse.json(
        {
          success: false,
          error: `Email delivery is not fully configured. Missing: ${summary.missing.join(", ")}`,
        },
        { status: 503 }
      );
    }

    const destination = process.env.CONTACT_EMAIL || process.env.BOOKING_NOTIFICATION_EMAIL;
    if (!destination) {
      return NextResponse.json(
        {
          success: false,
          error: "Office inbox is not configured.",
        },
        { status: 503 }
      );
    }

    const email = buildOperationalTestEmail({
      initiatedBy: session.email || session.role,
      timestamp: new Date().toISOString(),
    });

    await sendTransactionalEmail({
      to: destination,
      subject: email.subject,
      text: email.text,
      html: email.html,
      replyTo: session.email || undefined,
    });

    return NextResponse.json({
      success: true,
      message: "Test email sent to the office inbox.",
      destination: summary.officeDestination,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send test email",
      },
      { status: getStatusCode(error) }
    );
  }
}
