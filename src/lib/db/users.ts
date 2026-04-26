import { supabaseAdmin } from "@/lib/supabase/admin";

export async function getUserProfile(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}

export async function createUserProfile(userId: string, userData: Record<string, unknown>) {
  const { error } = await supabaseAdmin
    .from("users")
    .upsert({ id: userId, ...userData });

  if (error) throw error;
}

export async function findUserByEmail(email: string) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) throw error;

  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
}
