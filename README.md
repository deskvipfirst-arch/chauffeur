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

## Optional flight provider

Set these values to use a real flight-status source:
- FLIGHT_STATUS_API_URL
- FLIGHT_STATUS_API_KEY

If they are not set, the app safely falls back to simulated flight data.
