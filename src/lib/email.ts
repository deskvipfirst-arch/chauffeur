import { APP_NAME, CONTACT_EMAIL, CONTACT_PHONE, OWNER_DEFAULT_NOTIFICATION_EMAIL, WEBSITE_URL } from "@/lib/globalConfig";

type DeliveryCheckInput = {
  apiKey?: string | null;
  fromEmail?: string | null;
};

type EmailConfigSummaryInput = DeliveryCheckInput & {
  contactEmail?: string | null;
  bookingNotificationEmail?: string | null;
};

type OperationalTestEmailInput = {
  initiatedBy?: string | null;
  timestamp?: string;
};

type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  from?: string;
};

type ContactNotificationInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
};

type BookingConfirmationInput = {
  fullName: string;
  email: string;
  bookingRef: string;
  serviceType: string;
  dateTime: string;
  pickupLocation: string;
  dropoffLocation?: string | null;
  amount: number;
  supportEmail?: string;
};

type GreeterAssignmentEmailInput = {
  bookingRef: string;
  passengerName: string;
  passengerEmail?: string;
  serviceType: string;
  dateTime: string;
  pickupLocation: string;
  dropoffLocation?: string | null;
  greeterName: string;
  greeterEmail?: string;
  greeterPhone?: string;
  supportEmail?: string;
};

const BRAND_NAME = APP_NAME;
const BRAND_ACCENT = "#DAA520";
const BRAND_DARK = "#1D3557";
const DEFAULT_OFFICE_INBOX = OWNER_DEFAULT_NOTIFICATION_EMAIL;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildInfoRow(label: string, value: string) {
  return `
    <tr>
      <td style="padding:8px 0;vertical-align:top;width:38%;font-size:13px;color:#6b7280;font-weight:600;white-space:nowrap;">${label}</td>
      <td style="padding:8px 0 8px 12px;vertical-align:top;font-size:13px;color:#111827;">${value}</td>
    </tr>
  `.trim();
}

function buildCtaButton(text: string, url: string) {
  return `
    <div style="text-align:center;margin:28px 0 4px;">
      <a href="${url}" target="_blank"
        style="display:inline-block;padding:13px 38px;background:${BRAND_ACCENT};color:${BRAND_DARK};font-family:Arial,sans-serif;font-size:14px;font-weight:700;text-decoration:none;border-radius:5px;letter-spacing:0.4px;line-height:1;">
        ${text}
      </a>
    </div>
  `.trim();
}

function buildEmailShell(input: {
  title: string;
  intro: string;
  contentHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  footerNote?: string;
  supportEmail?: string;
  preheader?: string;
}) {
  const supportEmail = escapeHtml(input.supportEmail || process.env.CONTACT_EMAIL || process.env.RESEND_FROM_EMAIL || CONTACT_EMAIL);
  const preheaderHtml = input.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#ffffff;opacity:0;">${escapeHtml(input.preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>`
    : "";
  const ctaHtml = input.ctaText && input.ctaUrl ? buildCtaButton(input.ctaText, input.ctaUrl) : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0" />
<title>${escapeHtml(input.title)}</title>
</head>
<body style="margin:0;padding:0;background:#eef0f3;font-family:Arial,Helvetica,sans-serif;">
${preheaderHtml}
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#eef0f3;padding:32px 16px;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;">

        <!-- HEADER -->
        <tr>
          <td style="background:${BRAND_DARK};border-radius:10px 10px 0 0;padding:36px 44px 28px;text-align:center;">
            <div style="display:inline-block;width:44px;height:3px;background:${BRAND_ACCENT};border-radius:2px;margin-bottom:18px;"></div>
            <div style="font-size:22px;font-weight:700;letter-spacing:3px;color:#ffffff;text-transform:uppercase;font-family:Georgia,serif;">
              ${BRAND_NAME}
            </div>
            <div style="margin-top:6px;font-size:11px;letter-spacing:2px;color:#94a3b8;text-transform:uppercase;">
              Premium Meet &amp; Greet Services
            </div>
          </td>
        </tr>

        <!-- GOLD ACCENT BAR -->
        <tr>
          <td style="height:4px;background:linear-gradient(90deg,#9a6a00,${BRAND_ACCENT},#9a6a00);"></td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="background:#ffffff;padding:40px 44px 32px;">
            <h1 style="margin:0 0 6px;font-size:21px;font-weight:700;color:${BRAND_DARK};font-family:Georgia,serif;line-height:1.3;">
              ${escapeHtml(input.title)}
            </h1>
            <div style="width:36px;height:2px;background:${BRAND_ACCENT};margin:0 0 20px;border-radius:2px;"></div>
            <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.75;">
              ${escapeHtml(input.intro)}
            </p>

            <!-- CONTENT CARD -->
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-left:4px solid ${BRAND_ACCENT};border-radius:6px;padding:20px 24px;">
              ${input.contentHtml}
            </div>

            ${ctaHtml}
          </td>
        </tr>

        <!-- DIVIDER -->
        <tr>
          <td style="background:#ffffff;padding:0 44px;">
            <div style="height:1px;background:#e5e7eb;"></div>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:${BRAND_DARK};border-radius:0 0 10px 10px;padding:28px 44px;text-align:center;">
            <div style="font-size:13px;font-weight:700;letter-spacing:2px;color:${BRAND_ACCENT};text-transform:uppercase;margin-bottom:10px;">
              ${BRAND_NAME}
            </div>
            <div style="font-size:12px;color:#94a3b8;line-height:1.9;">
              <div>8 Spout Lane North, Heathrow, London TW19 6BW</div>
              <div>${escapeHtml(CONTACT_PHONE)}&nbsp;&nbsp;|&nbsp;&nbsp;${supportEmail}</div>
            </div>
            <div style="margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.1);font-size:11px;color:#64748b;line-height:1.6;">
              <div>${escapeHtml(input.footerNote || "Thank you for choosing VIP Greeters.")}</div>
              <div style="margin-top:4px;">&copy; ${new Date().getFullYear()} ${BRAND_NAME}. All rights reserved.</div>
            </div>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`.trim();
}

export function maskEmailAddress(value?: string | null) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;

  const [localPart, domain] = trimmed.split("@");
  if (!domain) return trimmed;

  const maskedLocal = `${localPart.charAt(0) || "•"}${"•".repeat(Math.max(1, localPart.length - 1))}`;
  return `${maskedLocal}@${domain}`;
}

function splitEmailRecipients(value?: string | null) {
  return String(value ?? "")
    .split(/[;,\n]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function getOfficeNotificationRecipients(input: EmailConfigSummaryInput = {}) {
  const bookingNotificationEmail = String(input.bookingNotificationEmail ?? process.env.BOOKING_NOTIFICATION_EMAIL ?? "").trim();

  const bookingRecipients = splitEmailRecipients(bookingNotificationEmail);
  const defaultRecipients = splitEmailRecipients(DEFAULT_OFFICE_INBOX);
  const recipients = bookingRecipients.length > 0 ? bookingRecipients : defaultRecipients;
  if (recipients.length === 0) {
    recipients.push(DEFAULT_OFFICE_INBOX);
  }

  return Array.from(new Set(recipients));
}

export function getTransactionalEmailConfigSummary(input: EmailConfigSummaryInput = {}) {
  const apiKey = String(input.apiKey ?? process.env.RESEND_API_KEY ?? "").trim();
  const fromEmail = String(input.fromEmail ?? process.env.RESEND_FROM_EMAIL ?? "").trim();
  const contactEmail = String(input.contactEmail ?? process.env.CONTACT_EMAIL ?? "").trim();
  const bookingNotificationEmail = String(input.bookingNotificationEmail ?? process.env.BOOKING_NOTIFICATION_EMAIL ?? "").trim();
  const officeRecipients = getOfficeNotificationRecipients({ bookingNotificationEmail });
  const officeDestination = officeRecipients.map((item) => maskEmailAddress(item)).filter(Boolean).join(", ");
  const missing: string[] = [];

  if (!apiKey) missing.push("RESEND_API_KEY");
  if (!fromEmail) missing.push("RESEND_FROM_EMAIL");

  return {
    configured: missing.length === 0,
    fromEmail: maskEmailAddress(fromEmail),
    contactEmail: maskEmailAddress(contactEmail),
    bookingNotificationEmail: maskEmailAddress(bookingNotificationEmail),
    officeDestination,
    missing,
  };
}

export function buildOperationalTestEmail(input: OperationalTestEmailInput = {}) {
  const initiatedBy = String(input.initiatedBy ?? "Operations").trim() || "Operations";
  const when = input.timestamp
    ? new Date(input.timestamp)
    : new Date();

  const formattedDate = Number.isNaN(when.getTime())
    ? String(input.timestamp ?? new Date().toISOString())
    : when.toLocaleString("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      });

  return {
    subject: `Email delivery test • ${BRAND_NAME}`,
    text: `This is a test email from ${BRAND_NAME}. Triggered by ${initiatedBy} on ${formattedDate}.`,
    html: buildEmailShell({
      title: "Email delivery test",
      intro: "This confirms that transactional email delivery is currently active.",
      contentHtml: `
        <p style="margin:0 0 8px;"><strong>Status:</strong> Resend is connected and responding.</p>
        <p style="margin:0 0 8px;"><strong>Triggered by:</strong> ${escapeHtml(initiatedBy)}</p>
        <p style="margin:0;"><strong>Time:</strong> ${escapeHtml(formattedDate)}</p>
      `,
      footerNote: "This was sent from the VIP Greeters admin dashboard.",
    }),
  };
}

export function canSendTransactionalEmail(input: DeliveryCheckInput = {}) {
  const apiKey = String(input.apiKey ?? process.env.RESEND_API_KEY ?? "").trim();
  const fromEmail = String(input.fromEmail ?? process.env.RESEND_FROM_EMAIL ?? "").trim();
  return Boolean(apiKey && fromEmail);
}

export async function sendTransactionalEmail(input: SendEmailInput) {
  const apiKey = String(process.env.RESEND_API_KEY ?? "").trim();
  const fromEmail = String(input.from ?? process.env.RESEND_FROM_EMAIL ?? "").trim();

  if (!canSendTransactionalEmail({ apiKey, fromEmail })) {
    return {
      ok: false,
      skipped: true,
      error: "Resend is not configured",
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: Array.isArray(input.to) ? input.to : [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      reply_to: input.replyTo,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(String((payload as any)?.message || (payload as any)?.error || "Failed to send email"));
  }

  return {
    ok: true,
    skipped: false,
    data: payload,
  };
}

export function buildContactNotificationEmail(input: ContactNotificationInput) {
  const fullName = `${input.firstName} ${input.lastName}`.trim();
  const subject = `New contact enquiry: ${input.subject?.trim() || "General enquiry"}`;
  const safeMessage = escapeHtml(input.message).replace(/\n/g, "<br />");

  return {
    subject,
    text: `New contact enquiry from ${fullName || "Unknown sender"}\nEmail: ${input.email}\nPhone: ${input.phone || "Not provided"}\n\n${input.message}`,
    html: buildEmailShell({
      preheader: `New message from ${fullName || "website visitor"}: ${input.subject?.trim() || "General enquiry"}`,
      title: "New Contact Enquiry",
      intro: "A visitor has submitted a message via the website contact form.",
      contentHtml: `
        <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
          ${buildInfoRow("Name", escapeHtml(fullName || "Unknown sender"))}
          ${buildInfoRow("Email", escapeHtml(input.email))}
          ${buildInfoRow("Phone", escapeHtml(input.phone?.trim() || "Not provided"))}
          ${buildInfoRow("Subject", escapeHtml(input.subject?.trim() || "General enquiry"))}
          <tr><td colspan="2" style="padding-top:14px;"><div style="height:1px;background:#e5e7eb;"></div></td></tr>
          <tr>
            <td colspan="2" style="padding:14px 0 0;font-size:13px;color:#374151;line-height:1.75;">${safeMessage}</td>
          </tr>
        </table>
      `,
      footerNote: "Website enquiry received via VIP Greeters.",
    }),
  };
}

export function buildBookingConfirmationEmail(input: BookingConfirmationInput) {
  const serviceDate = new Date(input.dateTime);
  const formattedDate = Number.isNaN(serviceDate.getTime())
    ? input.dateTime
    : serviceDate.toLocaleString("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      });

  return {
    subject: `Booking confirmed — ${input.bookingRef} | VIP Greeters`,
    text: `Hello ${input.fullName}, your payment for booking ${input.bookingRef} has been confirmed. Service: ${input.serviceType}. Pickup: ${input.pickupLocation}. ${input.dropoffLocation ? `Drop-off: ${input.dropoffLocation}. ` : ""}Date: ${formattedDate}. Amount paid: £${input.amount.toFixed(2)}. Our booking team will now review your booking and assign your greeter at least 24 hours before your booked time.`,
    html: buildEmailShell({
      preheader: `Your booking ${input.bookingRef} is confirmed — we'll assign your greeter shortly.`,
      title: "Your Booking is Confirmed",
      intro: `Hello ${escapeHtml(input.fullName)}, thank you for choosing VIP Greeters. Your payment has been received and your booking is now queued for office review. We will assign a dedicated greeter at least 24 hours before your service.`,
      contentHtml: `
        <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
          ${buildInfoRow("Booking Ref", escapeHtml(input.bookingRef))}
          ${buildInfoRow("Service", escapeHtml(input.serviceType))}
          ${buildInfoRow("Date &amp; Time", escapeHtml(formattedDate))}
          ${buildInfoRow("Pickup", escapeHtml(input.pickupLocation))}
          ${input.dropoffLocation ? buildInfoRow("Drop-off", escapeHtml(input.dropoffLocation)) : ""}
          ${buildInfoRow("Amount Paid", `<strong style="color:${BRAND_DARK};">£${input.amount.toFixed(2)}</strong>`)}
        </table>
        <div style="margin-top:18px;padding:14px;background:#fffbea;border:1px solid #fde68a;border-radius:5px;font-size:13px;color:#92400e;">
          <strong>What happens next?</strong> Our office team will confirm your booking and assign a greeter.
          You will receive a separate email as soon as your greeter is confirmed.
        </div>
      `,
      footerNote: "VIP Greeters — Premium Meet & Greet Services at Heathrow.",
      supportEmail: input.supportEmail,
    }),
  };
}

export function buildOfficeBookingNotificationEmail(input: BookingConfirmationInput) {
  const customer = escapeHtml(`${input.fullName} (${input.email})`);
  const serviceDate = new Date(input.dateTime);
  const formattedDate = Number.isNaN(serviceDate.getTime())
    ? input.dateTime
    : serviceDate.toLocaleString("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      });
  const appUrl = String(process.env.NEXT_PUBLIC_BASE_URL || WEBSITE_URL || "").trim().replace(/\/$/, "");
  const adminUrl = appUrl ? `${appUrl}/administrator/signin` : "";

  return {
    subject: `Action required: New booking ${input.bookingRef}`,
    text: `New paid booking received. Ref: ${input.bookingRef}. Customer: ${input.fullName} (${input.email}). Service: ${input.serviceType}. Date: ${formattedDate}. Pickup: ${input.pickupLocation}. ${input.dropoffLocation ? `Drop-off: ${input.dropoffLocation}. ` : ""}Amount: £${input.amount.toFixed(2)}. Office workflow: confirm booking and assign a greeter at least 24 hours before service time. Please review it in the office dashboard${adminUrl ? `: ${adminUrl}` : "."}`,
    html: buildEmailShell({
      preheader: `New paid booking from ${input.fullName} — assign a greeter before ${formattedDate}`,
      title: "New Booking — Office Action Required",
      intro: "A customer payment has cleared. Please confirm the booking and assign an available greeter at least 24 hours before the service time.",
      contentHtml: `
        <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
          ${buildInfoRow("Reference", escapeHtml(input.bookingRef))}
          ${buildInfoRow("Customer", customer)}
          ${buildInfoRow("Service", escapeHtml(input.serviceType))}
          ${buildInfoRow("Date &amp; Time", escapeHtml(formattedDate))}
          ${buildInfoRow("Pickup", escapeHtml(input.pickupLocation))}
          ${input.dropoffLocation ? buildInfoRow("Drop-off", escapeHtml(input.dropoffLocation)) : ""}
          ${buildInfoRow("Amount Paid", `<strong style="color:${BRAND_DARK};">£${input.amount.toFixed(2)}</strong>`)}
        </table>
        <div style="margin-top:18px;padding:14px;background:#fef2f2;border:1px solid #fecaca;border-radius:5px;font-size:13px;color:#991b1b;">
          <strong>Next step:</strong> Open the dashboard, confirm this booking and assign an available greeter.
        </div>
      `,
      ctaText: adminUrl ? "Open Office Dashboard" : undefined,
      ctaUrl: adminUrl || undefined,
      footerNote: "This email was sent to the business owner and office operations inbox.",
      supportEmail: input.supportEmail,
    }),
  };
}

export function buildPassengerGreeterAssignmentEmail(input: GreeterAssignmentEmailInput) {
  const serviceDate = new Date(input.dateTime);
  const formattedDate = Number.isNaN(serviceDate.getTime())
    ? input.dateTime
    : serviceDate.toLocaleString("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      });

  const greeterName = String(input.greeterName || "Assigned greeter").trim();
  const greeterPhone = String(input.greeterPhone || "").trim();
  const greeterEmail = String(input.greeterEmail || "").trim().toLowerCase();

  return {
    subject: `Your greeter is confirmed — ${input.bookingRef} | VIP Greeters`,
    text: `Hello ${input.passengerName}, your greeter has been assigned for booking ${input.bookingRef}. Greeter: ${greeterName}.${greeterPhone ? ` Phone: ${greeterPhone}.` : ""}${greeterEmail ? ` Email: ${greeterEmail}.` : ""} Service: ${input.serviceType}. Date: ${formattedDate}. Pickup: ${input.pickupLocation}.${input.dropoffLocation ? ` Drop-off: ${input.dropoffLocation}.` : ""}`,
    html: buildEmailShell({
      preheader: `${greeterName} will meet you at ${input.pickupLocation} on ${formattedDate}`,
      title: "Your Greeter Has Been Assigned",
      intro: `Hello ${escapeHtml(input.passengerName)}, everything is in order for your upcoming journey. Your dedicated VIP greeter is confirmed and ready to assist you.`,
      contentHtml: `
        <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
          ${buildInfoRow("Booking Ref", escapeHtml(input.bookingRef))}
          ${buildInfoRow("Service", escapeHtml(input.serviceType))}
          ${buildInfoRow("Date &amp; Time", escapeHtml(formattedDate))}
          ${buildInfoRow("Pickup", escapeHtml(input.pickupLocation))}
          ${input.dropoffLocation ? buildInfoRow("Drop-off", escapeHtml(input.dropoffLocation)) : ""}
          <tr><td colspan="2" style="padding-top:14px;"><div style="height:1px;background:#e5e7eb;"></div></td></tr>
          <tr>
            <td colspan="2" style="padding:12px 0 4px;font-size:11px;font-weight:700;letter-spacing:1.5px;color:#6b7280;text-transform:uppercase;">Your Greeter</td>
          </tr>
          ${buildInfoRow("Name", `<strong>${escapeHtml(greeterName)}</strong>`)}
          ${greeterPhone ? buildInfoRow("Phone", `<a href="tel:${escapeHtml(greeterPhone)}" style="color:${BRAND_DARK};font-weight:600;">${escapeHtml(greeterPhone)}</a>`) : ""}
          ${greeterEmail ? buildInfoRow("Email", `<a href="mailto:${escapeHtml(greeterEmail)}" style="color:${BRAND_DARK};">${escapeHtml(greeterEmail)}</a>`) : ""}
        </table>
        <div style="margin-top:18px;padding:14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:5px;font-size:13px;color:#166534;">
          Please keep your phone available on the day of service in case your greeter needs to reach you.
        </div>
      `,
      footerNote: "VIP Greeters — Premium Meet & Greet Services at Heathrow.",
      supportEmail: input.supportEmail,
    }),
  };
}

export function buildGreeterAssignmentEmail(input: GreeterAssignmentEmailInput) {
  const serviceDate = new Date(input.dateTime);
  const formattedDate = Number.isNaN(serviceDate.getTime())
    ? input.dateTime
    : serviceDate.toLocaleString("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      });

  const passengerName = String(input.passengerName || "Passenger").trim();
  const passengerEmail = String(input.passengerEmail || "").trim().toLowerCase();
  const appUrl = String(process.env.NEXT_PUBLIC_BASE_URL || WEBSITE_URL || "").trim().replace(/\/$/, "");
  const dashboardUrl = appUrl ? `${appUrl}/greeter/dashboard` : "";

  return {
    subject: `New job assigned: ${input.bookingRef} | VIP Greeters`,
    text: `You have been assigned booking ${input.bookingRef}. Passenger: ${passengerName}.${passengerEmail ? ` Passenger email: ${passengerEmail}.` : ""} Service: ${input.serviceType}. Date: ${formattedDate}. Pickup: ${input.pickupLocation}.${input.dropoffLocation ? ` Drop-off: ${input.dropoffLocation}.` : ""} Please confirm meet-up status from your greeter dashboard.`,
    html: buildEmailShell({
      preheader: `New assignment: meet ${passengerName} at ${input.pickupLocation} on ${formattedDate}`,
      title: "New Job Assignment",
      intro: "You have a new passenger booking assigned to you. Please review the details below and update your status via the greeter dashboard.",
      contentHtml: `
        <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
          ${buildInfoRow("Booking Ref", escapeHtml(input.bookingRef))}
          ${buildInfoRow("Service", escapeHtml(input.serviceType))}
          ${buildInfoRow("Date &amp; Time", `<strong style="color:${BRAND_DARK};">${escapeHtml(formattedDate)}</strong>`)}
          ${buildInfoRow("Pickup", `<strong>${escapeHtml(input.pickupLocation)}</strong>`)}
          ${input.dropoffLocation ? buildInfoRow("Drop-off", escapeHtml(input.dropoffLocation)) : ""}
          <tr><td colspan="2" style="padding-top:14px;"><div style="height:1px;background:#e5e7eb;"></div></td></tr>
          <tr>
            <td colspan="2" style="padding:12px 0 4px;font-size:11px;font-weight:700;letter-spacing:1.5px;color:#6b7280;text-transform:uppercase;">Passenger</td>
          </tr>
          ${buildInfoRow("Name", escapeHtml(passengerName))}
          ${passengerEmail ? buildInfoRow("Email", `<a href="mailto:${escapeHtml(passengerEmail)}" style="color:${BRAND_DARK};">${escapeHtml(passengerEmail)}</a>`) : ""}
        </table>
        <div style="margin-top:18px;padding:14px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:5px;font-size:13px;color:#1e40af;">
          Use your greeter dashboard to mark this booking as <strong>accepted</strong>, <strong>passenger met</strong>, and <strong>completed</strong>.
        </div>
      `,
      ctaText: dashboardUrl ? "Open Greeter Dashboard" : undefined,
      ctaUrl: dashboardUrl || undefined,
      footerNote: "This assignment was sent by the VIP Greeters office team.",
      supportEmail: input.supportEmail,
    }),
  };
}
