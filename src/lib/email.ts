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
};

const BRAND_NAME = "VIP Greeters";
const BRAND_SUBTITLE = "London Chauffeur Hire";
const BRAND_ACCENT = "#DAA520";
const BRAND_DARK = "#1D3557";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildEmailShell(input: {
  title: string;
  intro: string;
  contentHtml: string;
  footerNote?: string;
}) {
  const supportEmail = escapeHtml(process.env.CONTACT_EMAIL || process.env.RESEND_FROM_EMAIL || "office@vipgreeters.co.uk");

  return `
    <div style="margin:0;padding:24px;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;">
        <div style="background:${BRAND_DARK};padding:20px 24px;">
          <div style="font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${BRAND_ACCENT};">${BRAND_NAME}</div>
          <div style="margin-top:6px;font-size:20px;font-weight:700;color:#ffffff;">${BRAND_SUBTITLE}</div>
        </div>
        <div style="padding:24px;line-height:1.6;">
          <h2 style="margin:0 0 12px;font-size:24px;color:${BRAND_DARK};">${escapeHtml(input.title)}</h2>
          <p style="margin:0 0 16px;color:#374151;">${escapeHtml(input.intro)}</p>
          <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:16px;">
            ${input.contentHtml}
          </div>
        </div>
        <div style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e5e7eb;font-size:13px;color:#475569;">
          <p style="margin:0 0 6px;">Need help? Reply to this email or contact ${supportEmail}.</p>
          <p style="margin:0;">${escapeHtml(input.footerNote || "Thank you for choosing VIP Greeters.")}</p>
        </div>
      </div>
    </div>
  `.trim();
}

export function maskEmailAddress(value?: string | null) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;

  const [localPart, domain] = trimmed.split("@");
  if (!domain) return trimmed;

  const maskedLocal = `${localPart.charAt(0) || "•"}${"•".repeat(Math.max(1, localPart.length - 1))}`;
  return `${maskedLocal}@${domain}`;
}

export function getTransactionalEmailConfigSummary(input: EmailConfigSummaryInput = {}) {
  const apiKey = String(input.apiKey ?? process.env.RESEND_API_KEY ?? "").trim();
  const fromEmail = String(input.fromEmail ?? process.env.RESEND_FROM_EMAIL ?? "").trim();
  const contactEmail = String(input.contactEmail ?? process.env.CONTACT_EMAIL ?? "").trim();
  const bookingNotificationEmail = String(input.bookingNotificationEmail ?? process.env.BOOKING_NOTIFICATION_EMAIL ?? "").trim();
  const officeDestination = contactEmail || bookingNotificationEmail;
  const missing: string[] = [];

  if (!apiKey) missing.push("RESEND_API_KEY");
  if (!fromEmail) missing.push("RESEND_FROM_EMAIL");
  if (!officeDestination) missing.push("CONTACT_EMAIL or BOOKING_NOTIFICATION_EMAIL");

  return {
    configured: missing.length === 0,
    fromEmail: maskEmailAddress(fromEmail),
    contactEmail: maskEmailAddress(contactEmail),
    bookingNotificationEmail: maskEmailAddress(bookingNotificationEmail),
    officeDestination: maskEmailAddress(officeDestination),
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
  const safeName = escapeHtml(fullName || "Unknown sender");
  const safeEmail = escapeHtml(input.email);
  const safePhone = escapeHtml(input.phone?.trim() || "Not provided");

  return {
    subject,
    text: `New contact enquiry from ${fullName || "Unknown sender"}\nEmail: ${input.email}\nPhone: ${input.phone || "Not provided"}\n\n${input.message}`,
    html: buildEmailShell({
      title: "New contact enquiry",
      intro: "A new message has been sent from the website contact form.",
      contentHtml: `
        <p style="margin:0 0 8px;"><strong>Name:</strong> ${safeName}</p>
        <p style="margin:0 0 8px;"><strong>Email:</strong> ${safeEmail}</p>
        <p style="margin:0 0 8px;"><strong>Phone:</strong> ${safePhone}</p>
        <p style="margin:0 0 12px;"><strong>Subject:</strong> ${escapeHtml(input.subject?.trim() || "General enquiry")}</p>
        <div style="padding-top:12px;border-top:1px solid #e5e7eb;">${safeMessage}</div>
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
    subject: `Booking confirmed: ${input.bookingRef}`,
    text: `Hello ${input.fullName}, your booking ${input.bookingRef} has been confirmed. Service: ${input.serviceType}. Pickup: ${input.pickupLocation}. ${input.dropoffLocation ? `Drop-off: ${input.dropoffLocation}. ` : ""}Date: ${formattedDate}. Amount: £${input.amount.toFixed(2)}.`,
    html: buildEmailShell({
      title: "Your booking is confirmed",
      intro: `Hello ${input.fullName}, thank you for booking with us. Your chauffeur request has been confirmed.`,
      contentHtml: `
        <p style="margin:0 0 8px;"><strong>Booking reference:</strong> ${escapeHtml(input.bookingRef)}</p>
        <p style="margin:0 0 8px;"><strong>Service:</strong> ${escapeHtml(input.serviceType)}</p>
        <p style="margin:0 0 8px;"><strong>Date and time:</strong> ${escapeHtml(formattedDate)}</p>
        <p style="margin:0 0 8px;"><strong>Pickup:</strong> ${escapeHtml(input.pickupLocation)}</p>
        ${input.dropoffLocation ? `<p style="margin:0 0 8px;"><strong>Drop-off:</strong> ${escapeHtml(input.dropoffLocation)}</p>` : ""}
        <p style="margin:0;"><strong>Amount paid:</strong> £${input.amount.toFixed(2)}</p>
      `,
      footerNote: "Your VIP Greeters team will be in touch if anything else is needed.",
    }),
  };
}

export function buildOfficeBookingNotificationEmail(input: BookingConfirmationInput) {
  const customer = escapeHtml(`${input.fullName} (${input.email})`);

  return {
    subject: `New paid booking: ${input.bookingRef}`,
    text: `A booking has been paid. Ref: ${input.bookingRef}. Customer: ${input.fullName} (${input.email}). Pickup: ${input.pickupLocation}. Amount: £${input.amount.toFixed(2)}.`,
    html: buildEmailShell({
      title: "New paid booking",
      intro: "A customer has completed payment and the booking is ready for office review.",
      contentHtml: `
        <p style="margin:0 0 8px;"><strong>Reference:</strong> ${escapeHtml(input.bookingRef)}</p>
        <p style="margin:0 0 8px;"><strong>Customer:</strong> ${customer}</p>
        <p style="margin:0 0 8px;"><strong>Service:</strong> ${escapeHtml(input.serviceType)}</p>
        <p style="margin:0 0 8px;"><strong>Pickup:</strong> ${escapeHtml(input.pickupLocation)}</p>
        ${input.dropoffLocation ? `<p style="margin:0 0 8px;"><strong>Drop-off:</strong> ${escapeHtml(input.dropoffLocation)}</p>` : ""}
        <p style="margin:0;"><strong>Amount paid:</strong> £${input.amount.toFixed(2)}</p>
      `,
      footerNote: "Office follow-up may now begin for this booking.",
    }),
  };
}
