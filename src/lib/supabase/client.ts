import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
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
  const { data } = await supabaseClient.auth.getSession();
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
  } = await supabaseClient.auth.getUser();

  return setCachedUser(user);
}

export const auth = {
  get currentUser() {
    return cachedUser;
  },
  async signOut() {
    cachedUser = null;
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
  },
};

if (typeof window !== "undefined") {
  void getCurrentUser();
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    setCachedUser(session?.user ?? null);
  });
}

export const db = supabaseClient;
export const storage = supabaseClient.storage;
