import { createClient } from "@supabase/supabase-js";
import type { ExtraCharge, Location, ServiceRate, Vehicle, BookingData, UserData } from "@/lib/types";
import { COLLECTIONS } from "@/lib/types";
import { canonicalizeUserRole, isAllowedRole } from "@/lib/roles";

type JsonObject = Record<string, unknown>;

const APP_TO_DB_FIELD_ALIASES: Record<string, string> = {
  firstName: "firstname",
  lastName: "lastname",
  first_name: "firstname",
  last_name: "lastname",
  createdAt: "createdat",
  updatedAt: "updatedat",
  isFirstAdmin: "isfirstadmin",
  paymentDetails: "paymentdetails",
  baseRate: "baserate",
  driverId: "driverid",
  bookingId: "bookingid",
  paymentDate: "paymentdate",
  paymentMethod: "paymentmethod",
};

const DB_TO_APP_FIELD_ALIASES: Record<string, string> = {
  firstname: "firstName",
  lastname: "lastName",
  createdat: "createdAt",
  updatedat: "updatedAt",
  isfirstadmin: "isFirstAdmin",
  paymentdetails: "paymentDetails",
  baserate: "baseRate",
  driverid: "driverId",
  bookingid: "bookingId",
  paymentdate: "paymentDate",
  paymentmethod: "paymentMethod",
  first_name: "firstName",
  last_name: "lastName",
  is_first_admin: "isFirstAdmin",
  payment_details: "paymentDetails",
  base_rate: "baseRate",
  driver_id: "driverId",
  booking_id: "bookingId",
  payment_date: "paymentDate",
  payment_method: "paymentMethod",
};

export function normalizeDbRow(row: unknown): JsonObject {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    return (row as JsonObject) || {};
  }

  const normalized = { ...(row as JsonObject) } as JsonObject;
  for (const [dbField, appField] of Object.entries(DB_TO_APP_FIELD_ALIASES)) {
    if (normalized[dbField] !== undefined && normalized[appField] === undefined) {
      normalized[appField] = normalized[dbField];
    }
  }

  if (normalized.createdat !== undefined) {
    if (normalized.createdAt === undefined) normalized.createdAt = normalized.createdat;
    if (normalized.created_at === undefined) normalized.created_at = normalized.createdat;
  }

  if (normalized.updatedat !== undefined) {
    if (normalized.updatedAt === undefined) normalized.updatedAt = normalized.updatedat;
    if (normalized.updated_at === undefined) normalized.updated_at = normalized.updatedat;
  }

  return normalized;
}

export function sanitizeMutationPayload(data: object) {
  const payload = { ...(data as JsonObject) };

  for (const [appField, dbField] of Object.entries(APP_TO_DB_FIELD_ALIASES)) {
    if (payload[appField] !== undefined) {
      if (payload[dbField] === undefined) {
        payload[dbField] = payload[appField];
      }
      delete payload[appField];
    }
  }

  return payload;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!serviceRoleKey && typeof window === "undefined") {
  console.warn("Missing SUPABASE_SERVICE_ROLE_KEY environment variable. Admin functions will fail.");
}

const GREETER_INVOICES_TABLE = "greeter_invoices";
const APP_SETTINGS_TABLE = "app_settings";
const OFFICE_NOTIFICATION_EMAIL_KEY = "office_notification_email";

type DbRow = Record<string, unknown>;
type DynamicBuilder = {
  eq: (field: string, value: unknown) => DynamicBuilder;
  neq: (field: string, value: unknown) => DynamicBuilder;
  order: (field: string, options: { ascending: boolean }) => DynamicBuilder;
  then: <TResult1 = { data: DbRow[] | null; error: { code?: string; message?: string; details?: string } | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: DbRow[] | null; error: { code?: string; message?: string; details?: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) => PromiseLike<TResult1 | TResult2>;
};

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

function createSnapshot(rows: DbRow[]) {
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
    const { error } = await supabaseAdmin.from(APP_SETTINGS_TABLE).upsert(payload, { onConflict: "key" });
    if (error) throw error;
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

    const { error: legacyError } = await supabaseAdmin
      .from(COLLECTIONS.SERVICE_RATES)
      .upsert(legacyPayload, { onConflict: "id" });

    if (legacyError) {
      throw legacyError;
    }
  }

  return value;
}

export const adminDb = {
  collection(table: string) {
    return {
      async add(data: DbRow) {
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

        try {
          const { data: inserted, error } = await supabaseAdmin.from(table).insert(payload).select("*").single();
          if (error) throw error;
          return inserted;
        } catch (error) {
          if (table === COLLECTIONS.BOOKINGS && shouldDropBookingUserId(error as { code?: string; message?: string; details?: string } | null) && payload.user_id) {
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

            const { data: retriedInsert, error: retryError } = await supabaseAdmin
              .from(table)
              .insert(payload)
              .select("*")
              .single();
            if (retryError) throw retryError;
            return retriedInsert;
          }

          throw error;
        }
      },
      doc(id: string) {
        return {
          async set(data: DbRow) {
            const payload = sanitizeMutationPayload({ id, ...data });
            const { error } = await supabaseAdmin.from(table).upsert(payload);
            if (error) throw error;
          },
          async update(data: DbRow) {
            const payload = sanitizeMutationPayload(data);
            const { error } = await supabaseAdmin.from(table).update(payload).eq("id", id);
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
      where(field: string, op: string, value: unknown) {
        return {
          async get() {
            let builder = supabaseAdmin.from(table).select("*") as unknown as DynamicBuilder;
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
  return (data || []).map((row: DbRow) => ({ id: String(row.id), ...normalizeDbRow(row) })) as Location[];
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
  return rows.map((row: DbRow) => ({ id: String(row.id), ...normalizeDbRow(row) })) as ServiceRate[];
}

export async function getExtraCharges(): Promise<ExtraCharge[]> {
  const rows = await selectAllOrEmpty(COLLECTIONS.EXTRA_CHARGES);
  return rows.map((row: DbRow) => ({ id: String(row.id), ...normalizeDbRow(row) })) as ExtraCharge[];
}

export async function upsertServiceRate(serviceRate: ServiceRate): Promise<DbRow> {
  const { data, error } = await supabaseAdmin
    .from(COLLECTIONS.SERVICE_RATES)
    .upsert(sanitizeMutationPayload(serviceRate))
    .select("*")
    .single();

  if (error) throw error;
  return normalizeDbRow(data);
}

export async function updateServiceRate(id: string, data: Partial<ServiceRate>): Promise<DbRow> {
  const { data: updated, error } = await supabaseAdmin
    .from(COLLECTIONS.SERVICE_RATES)
    .update(sanitizeMutationPayload(data))
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return normalizeDbRow(updated);
}

export async function upsertExtraCharge(charge: ExtraCharge): Promise<DbRow> {
  const { data, error } = await supabaseAdmin
    .from(COLLECTIONS.EXTRA_CHARGES)
    .upsert(sanitizeMutationPayload(charge))
    .select("*")
    .single();

  if (error) throw error;
  return normalizeDbRow(data);
}

export async function updateExtraCharge(id: string, data: Partial<ExtraCharge>): Promise<DbRow> {
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
  return (data || []).map((row: DbRow) => ({ id: String(row.id), ...normalizeDbRow(row) })) as Vehicle[];
}

export async function getBookings(): Promise<DbRow[]> {
  const { data, error } = await supabaseAdmin
    .from(COLLECTIONS.BOOKINGS)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((row: DbRow) => normalizeDbRow(row));
}

export async function updateBooking(id: string, data: DbRow): Promise<DbRow> {
  const payload = sanitizeMutationPayload({ ...data, updated_at: new Date().toISOString() });
  const { data: updated, error } = await supabaseAdmin
    .from(COLLECTIONS.BOOKINGS)
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return normalizeDbRow(updated);
}

export async function getDrivers(): Promise<DbRow[]> {
  const { data, error } = await supabaseAdmin.from(COLLECTIONS.DRIVERS).select("*");

  if (error) {
    if (isMissingTableError(error)) {
      return [];
    }
    throw error;
  }

  return (data || [])
    .map((row: DbRow) => normalizeDbRow(row))
    .sort((left: DbRow, right: DbRow) => {
      const leftName = String(left?.firstName || left?.firstname || left?.full_name || left?.fullName || "").toLowerCase();
      const rightName = String(right?.firstName || right?.firstname || right?.full_name || right?.fullName || "").toLowerCase();
      return leftName.localeCompare(rightName);
    });
}

export async function getDriverByEmail(email: string): Promise<DbRow | null> {
  const { data, error } = await supabaseAdmin
    .from(COLLECTIONS.DRIVERS)
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (error) throw error;
  return normalizeDbRow(data);
}

export async function getDriverById(id: string): Promise<DbRow | null> {
  const normalizedId = String(id || "").trim();
  if (!normalizedId) return null;

  const { data, error } = await supabaseAdmin
    .from(COLLECTIONS.DRIVERS)
    .select("*")
    .eq("id", normalizedId)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) {
      return null;
    }
    throw error;
  }

  return normalizeDbRow(data);
}

export async function getBookingsForDriverEmail(email: string): Promise<DbRow[]> {
  const driver = await getDriverByEmail(email);
  if (!driver) return [];

  const { data, error } = await supabaseAdmin
    .from(COLLECTIONS.BOOKINGS)
    .select("*")
    .eq("driver_id", driver.id)
    .order("date_time", { ascending: true });

  if (error) throw error;
  return (data || []).map((row: DbRow) => normalizeDbRow(row));
}

export async function createBooking(bookingData: BookingData): Promise<DbRow> {
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

export async function getBooking(bookingId: string): Promise<(DbRow & { id: string }) | null> {
  const { data, error } = await supabaseAdmin.from(COLLECTIONS.BOOKINGS).select("*").eq("id", bookingId).maybeSingle();
  if (error) throw error;
  return data ? { id: String(data.id), ...normalizeDbRow(data) } : null;
}

export async function createUserProfile(userId: string, userData: UserData) {
  const payload = sanitizeMutationPayload({
    id: userId,
    ...userData,
  });

  const { error } = await supabaseAdmin.from(COLLECTIONS.USERS).upsert(payload);

  if (error) throw error;
}

export async function getUserProfile(userId: string): Promise<(DbRow & { id: string }) | null> {
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
  const role = canonicalizeUserRole(typeof profile?.role === "string" ? profile.role : "user");
  const email = String(user.email || "").trim().toLowerCase();

  if (!isAllowedRole(role, allowedRoles)) {
    throw new Error("Forbidden");
  }

  return { user, role, email };
}

export async function getGreeterInvoices(email?: string): Promise<DbRow[]> {
  let builder = supabaseAdmin
    .from(GREETER_INVOICES_TABLE)
    .select("*")
    .order("submitted_at", { ascending: false }) as unknown as DynamicBuilder;

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
}): Promise<DbRow> {
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

export async function reviewGreeterInvoice(id: string, updates: DbRow): Promise<DbRow> {
  const now = new Date().toISOString();
  const nextStatus = String(updates.office_status || "");
  const payload = {
    ...updates,
  };

  if (["under_review", "queried", "approved", "rejected", "paid", "unpaid"].includes(nextStatus)) {
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

export async function findUserByEmail(email: string) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) throw error;
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
}

