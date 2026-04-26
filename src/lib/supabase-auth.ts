import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { auth, db, getCurrentUser, setCachedUser, supabaseClient, toCompatUser, type CompatUser } from "@/lib/supabase/client";
import { doc, setDoc } from "@/lib/supabase-db";

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

  await setDoc(doc(db, "profiles", user.uid), {
    firstName: profile.firstName || "",
    lastName: profile.lastName || "",
    email: profile.email || user.email || "",
    phone: profile.phone || "",
    role: profile.role || "user",
  });

  return true;
}

export async function updateProfile(_user: any, profile: { displayName?: string; photoURL?: string | null }) {
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

export function onAuthStateChanged(_auth: typeof auth, callback: (user: any) => void) {
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
