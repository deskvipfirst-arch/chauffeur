import { NextResponse } from "next/server";
import {
  buildOperationalTestEmail,
  getOfficeNotificationRecipients,
  getTransactionalEmailConfigSummary,
  sendTransactionalEmail,
} from "@/lib/email";
import {
  getOfficeNotificationEmailSetting,
  requireAuthorizedUser,
  setOfficeNotificationEmailSetting,
} from "@/lib/supabase-admin";

export const runtime = "nodejs";

function getStatusCode(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";

  if (message === "Missing authorization token" || message === "Invalid authorization token") {
    return 401;
  }

  if (message === "Forbidden") {
    return 403;
  }

  if (
    message === "Office inbox email is required" ||
    message === "Please enter a valid email address" ||
    message === "Please enter valid email addresses separated by commas"
  ) {
    return 400;
  }

  if (message === "Database update required before the office inbox can be saved") {
    return 503;
  }

  return 500;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function parseOfficeInboxInput(value: string) {
  return String(value || "")
    .split(/[;,\n]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export async function GET(request: Request) {
  try {
    await requireAuthorizedUser(request.headers.get("authorization"), ["admin"]);
    const storedOfficeEmail = await getOfficeNotificationEmailSetting();

    const effectiveOfficeEmail =
      storedOfficeEmail ||
      process.env.BOOKING_NOTIFICATION_EMAIL ||
      process.env.CONTACT_EMAIL ||
      "desk.vipfirst@gmail.com";

    return NextResponse.json({
      success: true,
      email: {
        ...getTransactionalEmailConfigSummary({ bookingNotificationEmail: storedOfficeEmail ?? undefined }),
        officeDestinationValue: effectiveOfficeEmail,
      },
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
    const storedOfficeEmail = await getOfficeNotificationEmailSetting();
    const summary = getTransactionalEmailConfigSummary({ bookingNotificationEmail: storedOfficeEmail ?? undefined });

    if (!summary.configured) {
      return NextResponse.json(
        {
          success: false,
          error: `Email delivery is not fully configured. Missing: ${summary.missing.join(", ")}`,
        },
        { status: 503 }
      );
    }

    const destinations = getOfficeNotificationRecipients({ bookingNotificationEmail: storedOfficeEmail ?? undefined });
    if (destinations.length === 0) {
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
      to: destinations,
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

export async function PATCH(request: Request) {
  try {
    await requireAuthorizedUser(request.headers.get("authorization"), ["admin"]);
    const body = await request.json().catch(() => ({}));
    const recipients = parseOfficeInboxInput(String(body?.officeInbox || ""));

    if (recipients.length === 0 || recipients.some((item) => !isValidEmail(item))) {
      throw new Error("Please enter valid email addresses separated by commas");
    }

    const savedEmail = await setOfficeNotificationEmailSetting(recipients.join(", "));

    return NextResponse.json({
      success: true,
      message: "Office inbox updated successfully.",
      email: {
        ...getTransactionalEmailConfigSummary({ bookingNotificationEmail: savedEmail }),
        officeDestinationValue: savedEmail,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update office inbox",
      },
      { status: getStatusCode(error) }
    );
  }
}
