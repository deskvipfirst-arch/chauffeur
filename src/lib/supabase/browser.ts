import { createClient, type AuthChangeEvent, type Session, type User as SupabaseUser } from "@supabase/supabase-js";


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

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

export const supabase = supabaseClient;

function normalizeAuthError(error: unknown) {
  const errorObj = error as { message?: string; code?: string };
  const message = String(errorObj?.message || "Authentication failed");
  const code = (() => {
    const lower = message.toLowerCase();

    if (lower.includes("invalid login") || lower.includes("invalid credentials")) {
      return "auth/invalid-credential";
    }
    if (lower.includes("already registered") || lower.includes("already been registered")) {
      return "auth/email-already-in-use";
    }
    if (lower.includes("password") && lower.includes("least 6")) {
      return "auth/weak-password";
    }
    if (lower.includes("email") && lower.includes("invalid")) {
      return "auth/invalid-email";
    }
    if (lower.includes("rate limit") || lower.includes("too many")) {
      return "auth/too-many-requests";
    }
    return errorObj?.code || "auth/unknown";
  })();

  const errorDetails = (typeof error === "object" && error !== null)
    ? (error as Record<string, unknown>)
    : {};
  return { ...errorDetails, code, message };
}

export class GoogleAuthProvider {
  providerId = "google";
}

export async function signInWithEmailAndPassword(
  _auth: typeof auth,
  email: string,
  password: string
): Promise<{ user: CompatUser }> {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw normalizeAuthError(error);

  setCachedUser(data.user ?? null);
  const user = toCompatUser(data.user);
  if (!user) {
    throw normalizeAuthError({ message: "No user returned from Supabase sign-in." });
  }

  return { user };
}

export async function createUserWithEmailAndPassword(
  _auth: typeof auth,
  email: string,
  password: string,
  options?: {
    emailRedirectTo?: string;
    userData?: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      displayName?: string;
      role?: string;
    };
  }
): Promise<{ user: CompatUser; session: Session | null }> {
  const fullName =
    options?.userData?.displayName ||
    `${options?.userData?.firstName || ""} ${options?.userData?.lastName || ""}`.trim();

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: options?.emailRedirectTo,
      data: {
        firstName: options?.userData?.firstName,
        firstname: options?.userData?.firstName,
        first_name: options?.userData?.firstName,
        lastName: options?.userData?.lastName,
        lastname: options?.userData?.lastName,
        last_name: options?.userData?.lastName,
        phone: options?.userData?.phone,
        displayName: fullName || undefined,
        display_name: fullName || undefined,
        full_name: fullName || undefined,
        role: options?.userData?.role || "user",
      },
    },
  });
  if (error) throw normalizeAuthError(error);

  setCachedUser(data.user ?? null);
  const user = toCompatUser(data.user);
  if (!user) {
    throw normalizeAuthError({ message: "No user returned from Supabase sign-up." });
  }

  return { user, session: data.session ?? null };
}

export async function syncUserProfile(
  user: CompatUser,
  profile: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    role?: string;
  }
) {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  if (!sessionData.session || !user?.uid) {
    return false;
  }

  const { error } = await supabaseClient.from("profiles").upsert({
    id: user.uid,
    firstName: profile.firstName || "",
    lastName: profile.lastName || "",
    email: profile.email || user.email || "",
    phone: profile.phone || "",
    role: profile.role || "user",
  });
  
  if (error) throw error;

  return true;
}

export async function updateProfile(_user: CompatUser | null, profile: { displayName?: string; photoURL?: string | null }) {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  if (!sessionData.session) {
    return;
  }

  const { error } = await supabaseClient.auth.updateUser({
    data: {
      displayName: profile.displayName,
      display_name: profile.displayName,
      full_name: profile.displayName,
      avatar_url: profile.photoURL,
    },
  });

  if (error) throw normalizeAuthError(error);
}

export function onAuthStateChanged(_auth: typeof auth, callback: (user: CompatUser | null) => void) {
  void getCurrentUser().then(callback);

  const { data } = supabaseClient.auth.onAuthStateChange(
    (_event: AuthChangeEvent, session: Session | null) => {
      callback(setCachedUser(session?.user ?? null));
    }
  );

  return () => data.subscription.unsubscribe();
}

export async function signOut(_auth: typeof auth) {
  return auth.signOut();
}

export async function sendPasswordResetEmail(_auth: typeof auth, email: string) {
  const redirectTo =
    (typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined) ||
    process.env.NEXT_PUBLIC_BASE_URL;

  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) throw normalizeAuthError(error);
}

export async function resendSignUpVerificationEmail(_auth: typeof auth, email: string) {
  const emailRedirectTo =
    (typeof window !== "undefined" ? `${window.location.origin}/user/dashboard` : undefined) ||
    process.env.NEXT_PUBLIC_BASE_URL;

  const { error } = await supabaseClient.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo,
    },
  });

  if (error) throw normalizeAuthError(error);
}

export async function signInWithPopup(
  _auth: typeof auth,
  provider: GoogleAuthProvider,
  redirectPath = "/user/dashboard"
) {
  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}${redirectPath}` : undefined;

  const { data, error } = await supabaseClient.auth.signInWithOAuth({
    provider: provider.providerId as "google",
    options: { redirectTo },
  });

  if (error) throw normalizeAuthError(error);
  return data;
}

export async function verifyPasswordResetCode(_auth: typeof auth, _code: string) {
  const user = await getCurrentUser();
  return user?.email || "";
}

export async function confirmPasswordReset(_auth: typeof auth, _code: string, newPassword: string) {
  const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
  if (error) throw normalizeAuthError(error);
}
