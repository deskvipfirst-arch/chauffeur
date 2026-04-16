import { createClient } from "@supabase/supabase-js";
import type { ExtraCharge, Location, ServiceRate, Vehicle, BookingData, UserData } from "./types";
import { COLLECTIONS } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "placeholder-service-role-key";

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

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

export const adminDb = {
  collection(table: string) {
    return {
      async add(data: Record<string, any>) {
        let payload = { ...data };

        for (let attempt = 0; attempt < 8; attempt++) {
          const { data: inserted, error } = await supabaseAdmin.from(table).insert(payload).select("*").single();

          if (!error) {
            return inserted;
          }

          if (table === COLLECTIONS.BOOKINGS) {
            const missingColumn = extractMissingColumn(error);
            if (missingColumn && missingColumn in payload) {
              delete payload[missingColumn];
              continue;
            }
          }

          throw error;
        }

        throw new Error("Failed to create booking with the available schema");
      },
      doc(id: string) {
        return {
          async set(data: Record<string, any>) {
            const { error } = await supabaseAdmin.from(table).upsert({ id, ...data });
            if (error) throw error;
          },
          async update(data: Record<string, any>) {
            const { error } = await supabaseAdmin.from(table).update(data).eq("id", id);
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
  return (data || []).map((row: any) => ({ id: String(row.id), ...row })) as Location[];
}

export async function updateLocation(id: string, data: Partial<Location>): Promise<Location> {
  const { data: updated, error } = await supabaseAdmin
    .from(COLLECTIONS.LOCATIONS)
    .update(data)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return { id: String(updated.id), ...updated } as Location;
}

export async function deleteLocation(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from(COLLECTIONS.LOCATIONS).delete().eq("id", id);
  if (error) throw error;
}

export async function getServiceRates(): Promise<ServiceRate[]> {
  const rows = await selectAllOrEmpty(COLLECTIONS.SERVICE_RATES);
  return rows.map((row: any) => ({ id: String(row.id), ...row })) as ServiceRate[];
}

export async function getExtraCharges(): Promise<ExtraCharge[]> {
  const rows = await selectAllOrEmpty(COLLECTIONS.EXTRA_CHARGES);
  return rows.map((row: any) => ({ id: String(row.id), ...row })) as ExtraCharge[];
}

export async function upsertServiceRate(serviceRate: ServiceRate) {
  const { data, error } = await supabaseAdmin
    .from(COLLECTIONS.SERVICE_RATES)
    .upsert(serviceRate)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateServiceRate(id: string, data: Partial<ServiceRate>) {
  const { data: updated, error } = await supabaseAdmin
    .from(COLLECTIONS.SERVICE_RATES)
    .update(data)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return updated;
}

export async function upsertExtraCharge(charge: ExtraCharge) {
  const { data, error } = await supabaseAdmin
    .from(COLLECTIONS.EXTRA_CHARGES)
    .upsert(charge)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateExtraCharge(id: string, data: Partial<ExtraCharge>) {
  const { data: updated, error } = await supabaseAdmin
    .from(COLLECTIONS.EXTRA_CHARGES)
    .update(data)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return updated;
}

export async function getVehicles(): Promise<Vehicle[]> {
  const { data, error } = await supabaseAdmin.from(COLLECTIONS.VEHICLES).select("*");
  if (error) throw error;
  return (data || []).map((row: any) => ({ id: String(row.id), ...row })) as Vehicle[];
}

export async function createBooking(bookingData: BookingData) {
  const { data, error } = await supabaseAdmin
    .from(COLLECTIONS.BOOKINGS)
    .insert({
      ...bookingData,
      createdAt: new Date().toISOString(),
      status: "PENDING",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function getBooking(bookingId: string) {
  const { data, error } = await supabaseAdmin.from(COLLECTIONS.BOOKINGS).select("*").eq("id", bookingId).maybeSingle();
  if (error) throw error;
  return data ? { id: String(data.id), ...data } : null;
}

export async function createUserProfile(userId: string, userData: UserData) {
  const { error } = await supabaseAdmin.from(COLLECTIONS.USERS).upsert({
    id: userId,
    ...userData,
    createdAt: new Date().toISOString(),
  });

  if (error) throw error;
}

export async function getUserProfile(userId: string) {
  const { data, error } = await supabaseAdmin.from(COLLECTIONS.USERS).select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data ? { id: String(data.id), ...data } : null;
}
