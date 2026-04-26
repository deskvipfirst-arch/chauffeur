import type { Location, Vehicle } from "@/lib/types";
import {
  auth,
  db,
  getAccessToken,
  getCurrentUser,
  isSupabaseConfigured,
  setCachedUser,
  storage,
  supabaseClient,
  toCompatUser,
  type CompatUser,
} from "@/lib/supabase/client";

export const supabase = supabaseClient;
export {
  isSupabaseConfigured,
  type CompatUser,
  getAccessToken,
  toCompatUser,
  setCachedUser,
  getCurrentUser,
  auth,
  db,
  storage,
};

export async function getLocations(): Promise<Location[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .eq("status", "active");

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: String(row.id),
    ...row,
  })) as Location[];
}

export async function getVehicles(): Promise<Vehicle[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase.from("vehicles").select("*");

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: String(row.id),
    ...row,
  })) as Vehicle[];
}
