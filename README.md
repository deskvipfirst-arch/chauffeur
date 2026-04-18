# Chauffeur Operations Platform

A Next.js and Supabase chauffeur system for booking, dispatch, greeter operations, and invoice processing.

## Setup

1. Install dependencies

```bash
npm install
```

2. Copy the required values from [.env.example](.env.example).

3. Apply the database schema from [supabase/schema.sql](supabase/schema.sql) to Supabase.

4. Start the app locally

```bash
npm run dev
```

## Verification

```bash
npm test
npm run build
```

## Core workflow

1. Customer places a booking
2. Office assigns a greeter from the admin dashboard
3. Greeter updates the job through acceptance, pickup, and completion
4. Greeter submits an invoice
5. Office reviews and marks the invoice paid

## Email delivery with Resend

Set these values to enable transactional email delivery:
- RESEND_API_KEY
- RESEND_FROM_EMAIL
- CONTACT_EMAIL
- BOOKING_NOTIFICATION_EMAIL

This powers:
- contact form delivery to your office inbox
- paid booking confirmation emails to customers
- office notification emails for new paid bookings

For sign-up verification and password-reset emails, Supabase Auth still handles delivery. To route those through Resend as well, configure Resend SMTP inside your Supabase Auth email settings.

## Optional flight provider

Set these values to use a real flight-status source:
- FLIGHT_STATUS_API_URL
- FLIGHT_STATUS_API_KEY

If they are not set, the app safely falls back to simulated flight data.
