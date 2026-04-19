import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";
import type { Location, Vehicle } from "@/lib/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: typeof window !== "undefined",
    autoRefreshToken: typeof window !== "undefined",
    detectSessionInUrl: true,
  },
});

export type CompatUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role?: string | null;
  getIdToken: () => Promise<string>;
};

let cachedUser: CompatUser | null = null;

export async function getAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || "";
}

export function toCompatUser(user: SupabaseUser | null): CompatUser | null {
  if (!user) return null;

  return {
    uid: user.id,
    email: user.email ?? null,
    displayName:
      user.user_metadata?.displayName ||
      user.user_metadata?.display_name ||
      user.user_metadata?.full_name ||
      null,
    photoURL: user.user_metadata?.avatar_url || null,
    role: typeof user.user_metadata?.role === "string" ? user.user_metadata.role : null,
    getIdToken: getAccessToken,
  };
}

export function setCachedUser(user: SupabaseUser | null) {
  cachedUser = toCompatUser(user);
  return cachedUser;
}

export async function getCurrentUser(): Promise<CompatUser | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return setCachedUser(user);
}

export const auth = {
  get currentUser() {
    return cachedUser;
  },
  async signOut() {
    cachedUser = null;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
};

if (typeof window !== "undefined") {
  void getCurrentUser();
  supabase.auth.onAuthStateChange((_event, session) => {
    setCachedUser(session?.user ?? null);
  });
}

export const db = supabase;
export const storage = supabase.storage;

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
