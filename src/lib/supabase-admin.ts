import { createClient } from "@supabase/supabase-js";
import type { ExtraCharge, Location, ServiceRate, Vehicle, BookingData, UserData } from "./types";
import { COLLECTIONS } from "./types";
import { normalizeDbRow, sanitizeMutationPayload } from "./supabase-db";
import { canonicalizeUserRole, isAllowedRole } from "./roles";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "placeholder-service-role-key";

const GREETER_INVOICES_TABLE = "greeter_invoices";
const APP_SETTINGS_TABLE = "app_settings";
const OFFICE_NOTIFICATION_EMAIL_KEY = "office_notification_email";

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function getBearerToken(authHeader: string | null) {
  if (!authHeader) return "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return "";
  }
  return token.trim();
}

function createSnapshot(rows: any[]) {
  const docs = rows.map((row) => ({
    id: String(row.id ?? ""),
    data: () => row,
  }));

  return {
    empty: docs.length === 0,
    docs,
  };
}

function isMissingTableError(error: { code?: string; message?: string; details?: string } | null) {
  const errorText = `${error?.message ?? ""} ${error?.details ?? ""}`;
  return (
    error?.code === "PGRST205" ||
    error?.code === "42P01" ||
    /Could not find the table|relation .* does not exist/i.test(errorText)
  );
}

function extractMissingColumn(error: { message?: string; details?: string } | null) {
  const errorText = `${error?.message ?? ""} ${error?.details ?? ""}`;
  const match = errorText.match(/Could not find the ['"]([^'"]+)['"] column/i);
  return match?.[1] ?? null;
}

export function shouldDropBookingUserId(error: { code?: string; message?: string; details?: string } | null) {
  const errorText = `${error?.message ?? ""} ${error?.details ?? ""}`;
  return error?.code === "23503" && /bookings_user_id_fkey/i.test(errorText);
}

async function ensurePublicUserRecord(userId: string | null | undefined, input?: { email?: string; role?: string }) {
  const normalizedUserId = String(userId ?? "").trim();
  const normalizedEmail = String(input?.email ?? "").trim().toLowerCase();

  if (!normalizedUserId || !normalizedEmail) {
    return false;
  }

  let payload = sanitizeMutationPayload({
    id: normalizedUserId,
    email: normalizedEmail,
    role: canonicalizeUserRole(input?.role || "user"),
  });

  for (let attempt = 0; attempt < 4; attempt++) {
    const { error } = await supabaseAdmin.from(COLLECTIONS.USERS).upsert(payload, { onConflict: "id" });

    if (!error) {
      return true;
    }

    const missingColumn = extractMissingColumn(error);
    if (missingColumn && missingColumn in payload) {
      delete payload[missingColumn];
      continue;
    }

    if (isMissingTableError(error)) {
      return false;
    }

    throw error;
  }

  return false;
}

async function selectAllOrEmpty(table: string) {
  const { data, error } = await supabaseAdmin.from(table).select("*");

  if (error) {
    if (isMissingTableError(error)) {
      return [];
    }
    throw error;
  }

  return data || [];
}

async function getAppSetting(key: string) {
  const { data, error } = await supabaseAdmin
    .from(APP_SETTINGS_TABLE)
    .select("key, value")
    .eq("key", key)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) {
      const { data: legacyData, error: legacyError } = await supabaseAdmin
        .from(COLLECTIONS.SERVICE_RATES)
        .select("id, description")
        .eq("id", key)
        .maybeSingle();

      if (legacyError) {
        return null;
      }

      return typeof legacyData?.description === "string" ? legacyData.description.trim() : null;
    }
    throw error;
  }

  return typeof data?.value === "string" ? data.value.trim() : null;
}

async function setAppSetting(key: string, value: string) {
  const payload = {
    key,
    value,
    updated_at: new Date().toISOString(),
  };

  try {
    const { error } = await runMutationWithSchemaFallback(payload, async (nextPayload) =>
      await supabaseAdmin.from(APP_SETTINGS_TABLE).upsert(nextPayload, { onConflict: "key" })
    );
    if (error) {
      throw error;
    }
  } catch (error) {
    if (!isMissingTableError(error as { code?: string; message?: string; details?: string } | null)) {
      throw error;
    }

    const legacyPayload = sanitizeMutationPayload({
      id: key,
      type: "config",
      baseRate: 0,
      description: value,
    });

    const { error: legacyError } = await runMutationWithSchemaFallback(legacyPayload, async (nextPayload) =>
      await supabaseAdmin.from(COLLECTIONS.SERVICE_RATES).upsert(nextPayload, { onConflict: "id" })
    );

    if (legacyError) {
      throw legacyError;
    }
  }

  return value;
}

async function runMutationWithSchemaFallback<T>(
  payload: Record<string, any>,
  action: (nextPayload: Record<string, any>) => Promise<{ data?: T | null; error: any }>
) {
  let nextPayload = { ...payload };

  for (let attempt = 0; attempt < 8; attempt++) {
    const result = await action(nextPayload);

    if (!result.error) {
      return result;
    }

    const missingColumn = extractMissingColumn(result.error);
    if (missingColumn && missingColumn in nextPayload) {
      delete nextPayload[missingColumn];
      continue;
    }

    throw result.error;
  }

  throw new Error("Failed to apply mutation with the available schema.");
}

export const adminDb = {
  collection(table: string) {
    return {
      async add(data: Record<string, any>) {
        let payload = sanitizeMutationPayload({ ...data });

        if (table === COLLECTIONS.BOOKINGS && payload.user_id) {
          try {
            await ensurePublicUserRecord(String(payload.user_id), {
              email: String(payload.email ?? ""),
              role: "user",
            });
          } catch (error) {
            console.warn("User bootstrap warning:", error);
          }
        }

        for (let attempt = 0; attempt < 8; attempt++) {
          const { data: inserted, error } = await runMutationWithSchemaFallback<any>(payload, async (nextPayload) =>
            await supabaseAdmin.from(table).insert(nextPayload).select("*").single()
          );

          if (!error) {
            return inserted;
          }

          if (table === COLLECTIONS.BOOKINGS && shouldDropBookingUserId(error) && payload.user_id) {
            try {
              const createdUserRecord = await ensurePublicUserRecord(String(payload.user_id), {
                email: String(payload.email ?? ""),
                role: "user",
              });

              if (!createdUserRecord) {
                delete payload.user_id;
              }
            } catch (userError) {
              console.warn("Retrying booking without linked user record:", userError);
              delete payload.user_id;
            }
            continue;
          }

          throw error;
        }

        throw new Error("Failed to create booking with the available schema");
      },
      doc(id: string) {
        return {
          async set(data: Record<string, any>) {
            const payload = sanitizeMutationPayload({ id, ...data });
            const { error } = await runMutationWithSchemaFallback(payload, async (nextPayload) =>
              await supabaseAdmin.from(table).upsert(nextPayload)
            );
            if (error) throw error;
          },
          async update(data: Record<string, any>) {
            const payload = sanitizeMutationPayload(data);
            const { error } = await runMutationWithSchemaFallback(payload, async (nextPayload) =>
              await supabaseAdmin.from(table).update(nextPayload).eq("id", id)
            );
            if (error) throw error;
          },
          async delete() {
            const { error } = await supabaseAdmin.from(table).delete().eq("id", id);
            if (error) throw error;
          },
          async get() {
            const { data, error } = await supabaseAdmin.from(table).select("*").eq("id", id).maybeSingle();
            if (error) throw error;
            return {
              exists: Boolean(data),
              id,
              data: () => data,
            };
          },
        };
      },
      where(field: string, op: string, value: any) {
        return {
          async get() {
            let builder: any = supabaseAdmin.from(table).select("*");
            if (op === "==") builder = builder.eq(field, value);
            else if (op === "!=") builder = builder.neq(field, value);
            else builder = builder.eq(field, value);

            const { data, error } = await builder;
            if (error) throw error;
            return createSnapshot(data || []);
          },
        };
      },
    };
  },
};

export async function getLocations(): Promise<Location[]> {
  const { data, error } = await supabaseAdmin
    .from(COLLECTIONS.LOCATIONS)
    .select("*")
    .eq("status", "active");

  if (error) throw error;
  return (data || []).map((row: any) => ({ id: String(row.id), ...normalizeDbRow(row) })) as Location[];
}

export async function updateLocation(id: string, data: Partial<Location>): Promise<Location> {
  const { data: updated, error } = await supabaseAdmin
    .from(COLLECTIONS.LOCATIONS)
    .update(sanitizeMutationPayload(data))
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return { id: String(updated.id), ...normalizeDbRow(updated) } as Location;
}

export async function deleteLocation(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from(COLLECTIONS.LOCATIONS).delete().eq("id", id);
  if (error) throw error;
}

export async function getServiceRates(): Promise<ServiceRate[]> {
  const rows = await selectAllOrEmpty(COLLECTIONS.SERVICE_RATES);
  return rows.map((row: any) => ({ id: String(row.id), ...normalizeDbRow(row) })) as ServiceRate[];
}

export async function getExtraCharges(): Promise<ExtraCharge[]> {
  const rows = await selectAllOrEmpty(COLLECTIONS.EXTRA_CHARGES);
  return rows.map((row: any) => ({ id: String(row.id), ...normalizeDbRow(row) })) as ExtraCharge[];
}

export async function upsertServiceRate(serviceRate: ServiceRate) {
  const { data, error } = await supabaseAdmin
    .from(COLLECTIONS.SERVICE_RATES)
    .upsert(sanitizeMutationPayload(serviceRate))
    .select("*")
    .single();

  if (error) throw error;
  return normalizeDbRow(data);
}

export async function updateServiceRate(id: string, data: Partial<ServiceRate>) {
  const { data: updated, error } = await supabaseAdmin
    .from(COLLECTIONS.SERVICE_RATES)
    .update(sanitizeMutationPayload(data))
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return normalizeDbRow(updated);
}

export async function upsertExtraCharge(charge: ExtraCharge) {
  const { data, error } = await supabaseAdmin
    .from(COLLECTIONS.EXTRA_CHARGES)
    .upsert(sanitizeMutationPayload(charge))
    .select("*")
    .single();

  if (error) throw error;
  return normalizeDbRow(data);
}

export async function updateExtraCharge(id: string, data: Partial<ExtraCharge>) {
  const { data: updated, error } = await supabaseAdmin
    .from(COLLECTIONS.EXTRA_CHARGES)
    .update(sanitizeMutationPayload(data))
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return normalizeDbRow(updated);
}

export async function getVehicles(): Promise<Vehicle[]> {
  const { data, error } = await supabaseAdmin.from(COLLECTIONS.VEHICLES).select("*");
  if (error) throw error;
  return (data || []).map((row: any) => ({ id: String(row.id), ...normalizeDbRow(row) })) as Vehicle[];
}

export async function getBookings() {
  const { data, error } = await supabaseAdmin
    .from(COLLECTIONS.BOOKINGS)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((row: any) => normalizeDbRow(row));
}

export async function updateBooking(id: string, data: Record<string, any>) {
  const payload = sanitizeMutationPayload({ ...data, updated_at: new Date().toISOString() });
  const { data: updated, error } = await runMutationWithSchemaFallback<any>(payload, async (nextPayload) =>
    await supabaseAdmin
      .from(COLLECTIONS.BOOKINGS)
      .update(nextPayload)
      .eq("id", id)
      .select("*")
      .single()
  );

  if (error) throw error;
  return normalizeDbRow(updated);
}

export async function getDrivers() {
  const { data, error } = await supabaseAdmin
    .from(COLLECTIONS.DRIVERS)
    .select("*")
    .order("firstname", { ascending: true });

  if (error) throw error;
  return (data || []).map((row: any) => normalizeDbRow(row));
}

export async function getDriverByEmail(email: string) {
  const { data, error } = await supabaseAdmin
    .from(COLLECTIONS.DRIVERS)
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (error) throw error;
  return normalizeDbRow(data);
}

export async function getBookingsForDriverEmail(email: string) {
  const driver = await getDriverByEmail(email);
  if (!driver) return [];

  const { data, error } = await supabaseAdmin
    .from(COLLECTIONS.BOOKINGS)
    .select("*")
    .eq("driver_id", driver.id)
    .order("date_time", { ascending: true });

  if (error) throw error;
  return (data || []).map((row: any) => normalizeDbRow(row));
}

export async function createBooking(bookingData: BookingData) {
  const { data, error } = await supabaseAdmin
    .from(COLLECTIONS.BOOKINGS)
    .insert(
      sanitizeMutationPayload({
        ...bookingData,
        status: "PENDING",
      })
    )
    .select("*")
    .single();

  if (error) throw error;
  return normalizeDbRow(data);
}

export async function getBooking(bookingId: string) {
  const { data, error } = await supabaseAdmin.from(COLLECTIONS.BOOKINGS).select("*").eq("id", bookingId).maybeSingle();
  if (error) throw error;
  return data ? { id: String(data.id), ...normalizeDbRow(data) } : null;
}

export async function createUserProfile(userId: string, userData: UserData) {
  const payload = sanitizeMutationPayload({
    id: userId,
    ...userData,
  });

  const { error } = await runMutationWithSchemaFallback(payload, async (nextPayload) =>
    await supabaseAdmin.from(COLLECTIONS.USERS).upsert(nextPayload)
  );

  if (error) throw error;
}

export async function getUserProfile(userId: string) {
  const { data, error } = await supabaseAdmin.from(COLLECTIONS.USERS).select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data ? { id: String(data.id), ...normalizeDbRow(data) } : null;
}

export async function getOfficeNotificationEmailSetting() {
  return await getAppSetting(OFFICE_NOTIFICATION_EMAIL_KEY);
}

export async function setOfficeNotificationEmailSetting(email: string) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error("Office inbox email is required");
  }

  try {
    return await setAppSetting(OFFICE_NOTIFICATION_EMAIL_KEY, normalizedEmail);
  } catch (error) {
    if (isMissingTableError(error as { code?: string; message?: string; details?: string } | null)) {
      throw new Error("Database update required before the office inbox can be saved");
    }
    throw error;
  }
}

export async function requireAuthorizedUser(authHeader: string | null, allowedRoles: string[] = []) {
  const token = getBearerToken(authHeader);
  if (!token) {
    throw new Error("Missing authorization token");
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    throw new Error("Invalid authorization token");
  }

  const profile = await getUserProfile(user.id);
  const role = canonicalizeUserRole(profile?.role || "user");
  const email = String(user.email || "").trim().toLowerCase();

  if (!isAllowedRole(role, allowedRoles)) {
    throw new Error("Forbidden");
  }

  return { user, role, email };
}

export async function getGreeterInvoices(email?: string) {
  let builder: any = supabaseAdmin
    .from(GREETER_INVOICES_TABLE)
    .select("*")
    .order("submitted_at", { ascending: false });

  if (email) {
    builder = builder.eq("greeter_email", email.trim().toLowerCase());
  }

  const { data, error } = await builder;
  if (error) {
    if (isMissingTableError(error)) {
      return [];
    }
    throw error;
  }

  return data || [];
}

export async function createGreeterInvoice(input: {
  bookingId: string;
  email: string;
  amount: number;
  notes?: string | null;
}) {
  const email = input.email.trim().toLowerCase();
  const booking = await getBooking(input.bookingId);

  if (!booking) {
    throw new Error("Booking not found");
  }

  const driver = await getDriverByEmail(email);
  if (!driver) {
    throw new Error("Greeter profile not found");
  }

  if (booking.driver_id && String(booking.driver_id) !== String(driver.id)) {
    throw new Error("This booking is not assigned to the current greeter");
  }

  const lifecycleStatus = String(booking.driver_status || booking.status || "");
  if (lifecycleStatus !== "completed") {
    throw new Error("Complete the job before submitting an invoice");
  }

  const payload = {
    booking_id: booking.id,
    booking_ref: booking.booking_ref || null,
    greeter_id: driver.id,
    greeter_email: email,
    amount: Number(input.amount || 0),
    notes: input.notes?.trim() || null,
    office_status: "submitted",
    submitted_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from(GREETER_INVOICES_TABLE)
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("An invoice has already been submitted for this booking");
    }
    if (isMissingTableError(error)) {
      throw new Error("Greeter invoices table is missing. Apply the latest schema.");
    }
    throw error;
  }

  return data;
}

export async function reviewGreeterInvoice(id: string, updates: Record<string, any>) {
  const now = new Date().toISOString();
  const nextStatus = String(updates.office_status || "");
  const payload = {
    ...updates,
  };

  if (["under_review", "approved", "rejected", "paid"].includes(nextStatus)) {
    payload.reviewed_at = now;
    payload.reviewed_by = updates.reviewed_by || "office";
  }

  if (nextStatus === "paid") {
    payload.processed_at = now;
  }

  const { data, error } = await supabaseAdmin
    .from(GREETER_INVOICES_TABLE)
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    if (isMissingTableError(error)) {
      throw new Error("Greeter invoices table is missing. Apply the latest schema.");
    }
    throw error;
  }

  return data;
}
