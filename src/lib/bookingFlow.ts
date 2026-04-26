export const SERVICE_DETAILS_STORAGE_KEY = "serviceDetails";
export const BOOKING_DRAFT_STORAGE_KEY = "bookingDraft";

export type BookingDraft = {
  pickupLocationId?: string | null;
  dropoffLocationId?: string | null;
  pickupLocation?: string | null;
  meetUpLocation?: string | null;
  dropoffLocation?: string | null;
  customPickupAddress?: string;
  customDropoffAddress?: string;
  date?: string | Date;
  hour?: string;
  minute?: string;
  period?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  additionalRequests?: string;
  passengers?: number;
  additionalHours?: number;
  bags?: number;
  wantBuggy?: boolean;
  wantPorter?: boolean;
  contactConsent?: boolean;
  service_type?: "meetAndGreet" | "airportTransfer" | "hourlyHire";
  service_subtype?: "arrival" | "departure" | "connection" | null;
  calculatedAmount?: number | null;
  flightNumberArrival?: string;
  flightNumberDeparture?: string;
  vehicle?: string;
  estimatedPrice?: number;
  priceBreakdown?: Array<{ description: string; amount: number }>;
};

export function buildBookingDraft(input: Partial<BookingDraft> = {}): BookingDraft {
  const fallbackPickup = String(input.customPickupAddress ?? input.meetUpLocation ?? input.pickupLocation ?? "").trim();
  const fallbackDropoff = String(input.customDropoffAddress ?? input.dropoffLocation ?? "").trim();
  const pickupLocationId = input.pickupLocationId ?? (fallbackPickup ? "other" : null);
  const dropoffLocationId = input.dropoffLocationId ?? (fallbackDropoff ? "other" : null);

  return {
    ...input,
    pickupLocationId,
    dropoffLocationId,
    fullName: String(input.fullName ?? "").trim(),
    email: String(input.email ?? "").trim(),
    phone: String(input.phone ?? "").trim(),
    additionalRequests: String(input.additionalRequests ?? "").trim(),
    customPickupAddress: fallbackPickup,
    customDropoffAddress: fallbackDropoff,
    hour: String(input.hour ?? "14"),
    minute: String(input.minute ?? "00"),
    period: String(input.period ?? "pm"),
    passengers: Number(input.passengers ?? 1),
    additionalHours: Number(input.additionalHours ?? 0),
    bags: Number(input.bags ?? 0),
    wantBuggy: Boolean(input.wantBuggy),
    wantPorter: Boolean(input.wantPorter),
    contactConsent: Boolean(input.contactConsent),
    calculatedAmount: input.calculatedAmount ?? input.estimatedPrice ?? null,
  };
}

function safeParse(value: string | null) {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

export function loadStoredBookingDraft(): BookingDraft | null {
  if (typeof window === "undefined") return null;

  const rawServiceDetails = window.localStorage.getItem(SERVICE_DETAILS_STORAGE_KEY);
  const rawBookingDraft = window.localStorage.getItem(BOOKING_DRAFT_STORAGE_KEY);

  if (!rawServiceDetails && !rawBookingDraft) {
    return null;
  }

  const serviceDetails = safeParse(rawServiceDetails);
  const bookingDraft = safeParse(rawBookingDraft);
  return buildBookingDraft({ ...serviceDetails, ...bookingDraft });
}

export function saveStoredBookingDraft(input: Partial<BookingDraft>) {
  if (typeof window === "undefined") return;

  const draft = buildBookingDraft(input);
  window.localStorage.setItem(BOOKING_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  window.localStorage.setItem(SERVICE_DETAILS_STORAGE_KEY, JSON.stringify(draft));
}

export function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }

  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

export function getSignupErrorMessage(error: unknown) {
  const errorObj = error as { message?: string; code?: string };
  const message = String(errorObj?.message ?? "");
  const code = String(errorObj?.code ?? "").toLowerCase();
  const lower = message.toLowerCase();

  if (code.includes("email-already") || lower.includes("already registered")) {
    return "This email is already registered. Please sign in instead.";
  }

  if (code.includes("weak-password") || lower.includes("least 6")) {
    return "Password should be at least 6 characters.";
  }

  if (lower.includes("auth session missing")) {
    return "Your account was created, but email verification is still required. Please check your inbox and then sign in to continue your booking.";
  }

  return "Failed to create account. Please try again.";
}
