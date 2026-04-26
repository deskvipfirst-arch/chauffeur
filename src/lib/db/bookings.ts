import { supabaseAdmin } from "@/lib/supabase/admin";

export async function getBookings() {
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getBooking(id: string) {
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}

export async function updateBooking(id: string, data: Record<string, unknown>) {
  const { error } = await supabaseAdmin
    .from("bookings")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}
