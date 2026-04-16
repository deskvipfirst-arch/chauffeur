import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { auth, getCurrentUser, setCachedUser, supabase, toCompatUser, type CompatUser } from "@/lib/supabase";

function normalizeAuthError(error: any) {
  const message = String(error?.message || "Authentication failed");
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
    return error?.code || "auth/unknown";
  })();

  return { ...error, code, message };
}

export class GoogleAuthProvider {
  providerId = "google";
}

export async function signInWithEmailAndPassword(
  _auth: typeof auth,
  email: string,
  password: string
): Promise<{ user: CompatUser }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw normalizeAuthError(error);

  const user = toCompatUser(data.user);
  if (!user) {
    throw normalizeAuthError({ message: "No user returned from Supabase sign-in." });
  }

  return { user };
}

export async function createUserWithEmailAndPassword(
  _auth: typeof auth,
  email: string,
  password: string
): Promise<{ user: CompatUser }> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw normalizeAuthError(error);

  const user = toCompatUser(data.user);
  if (!user) {
    throw normalizeAuthError({ message: "No user returned from Supabase sign-up." });
  }

  return { user };
}

export async function updateProfile(_user: any, profile: { displayName?: string; photoURL?: string | null }) {
  const { error } = await supabase.auth.updateUser({
    data: {
      displayName: profile.displayName,
      display_name: profile.displayName,
      full_name: profile.displayName,
      avatar_url: profile.photoURL,
    },
  });

  if (error) throw normalizeAuthError(error);
}

export function onAuthStateChanged(_auth: typeof auth, callback: (user: any) => void) {
  void getCurrentUser().then(callback);

  const { data } = supabase.auth.onAuthStateChange(
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

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) throw normalizeAuthError(error);
}

export async function signInWithPopup(_auth: typeof auth, provider: GoogleAuthProvider) {
  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/user/dashboard` : undefined;

  const { data, error } = await supabase.auth.signInWithOAuth({
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
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw normalizeAuthError(error);
}
