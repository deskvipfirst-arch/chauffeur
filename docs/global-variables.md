# Global Variables and Handover

This project now has a shared config module at [src/lib/globalConfig.ts](src/lib/globalConfig.ts).

## Primary global values

- APP_NAME
- APP_SUBTITLE
- CONTACT_EMAIL
- CONTACT_PHONE
- OFFICE_ADDRESS_LINE_1
- OFFICE_ADDRESS_LINE_2
- OFFICE_ADDRESS_LINE_3
- OWNER_DEFAULT_NOTIFICATION_EMAIL
- WEBSITE_URL

## Where they are used

- Header contact strip: [src/components/ui/header.tsx](src/components/ui/header.tsx)
- Footer contact block: [src/components/ui/footer.tsx](src/components/ui/footer.tsx)
- Contact page info: [src/app/contact/page.tsx](src/app/contact/page.tsx)
- Privacy page contact: [src/app/privacy/page.tsx](src/app/privacy/page.tsx)
- Terms page contact: [src/app/terms/page.tsx](src/app/terms/page.tsx)
- Invoice PDF contact line: [src/app/api/generate-invoice/route.ts](src/app/api/generate-invoice/route.ts)
- Transactional email branding and defaults: [src/lib/email.ts](src/lib/email.ts)

## Environment variables for easier handover

Add these in deployment settings (and local env if needed):

- NEXT_PUBLIC_CONTACT_EMAIL
- NEXT_PUBLIC_CONTACT_PHONE
- NEXT_PUBLIC_OFFICE_ADDRESS_LINE_1
- NEXT_PUBLIC_OFFICE_ADDRESS_LINE_2
- NEXT_PUBLIC_OFFICE_ADDRESS_LINE_3
- NEXT_PUBLIC_BASE_URL

Keep server-only mail routing values too:

- CONTACT_EMAIL
- BOOKING_NOTIFICATION_EMAIL

## Office booking notification recipients

Office/Admin can edit recipients from dashboard Email Delivery panel.
The value is persisted in server settings and used by webhook and payment confirmation fallback routes.
