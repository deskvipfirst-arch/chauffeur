"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";

function sanitizeNextPath(value: string | null) {
  const candidate = String(value || "").trim();
  if (!candidate.startsWith("/") || candidate.startsWith("//")) {
    return "/";
  }

  return candidate;
}

function logAuthCallback(event: string, details: Record<string, unknown>) {
  console.info("[auth-callback]", event, details);
}

function setNeedsPasswordSetupCookie(value: "1" | "0") {
  if (typeof document === "undefined") return;
  if (value === "1") {
    document.cookie = "vip_needs_password_setup=1; path=/; max-age=3600; samesite=lax";
    return;
  }
  document.cookie = "vip_needs_password_setup=; path=/; max-age=0; samesite=lax";
}

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Verifying your invitation…");

  useEffect(() => {
    const tokenHash = searchParams.get("token_hash");
    const authCode = searchParams.get("code");
    const type = searchParams.get("type") as
      | "invite"
      | "recovery"
      | "email"
      | "magiclink"
      | "signup"
      | null;
    const next = sanitizeNextPath(searchParams.get("next"));

    const hashParams = typeof window !== "undefined"
      ? new URLSearchParams(window.location.hash.replace(/^#/, ""))
      : new URLSearchParams();
    const hashAccessToken = hashParams.get("access_token");
    const hashRefreshToken = hashParams.get("refresh_token");
    const hashTokenHash = hashParams.get("token_hash");
    const hashOtpType = hashParams.get("type") as
      | "invite"
      | "recovery"
      | "email"
      | "magiclink"
      | "signup"
      | null;
    const hashType = hashParams.get("type") as "invite" | null;

    logAuthCallback("received", {
      hasTokenHash: Boolean(tokenHash),
      hasCode: Boolean(authCode),
      hasHashAccessToken: Boolean(hashAccessToken),
      hasHashRefreshToken: Boolean(hashRefreshToken),
      hasHashTokenHash: Boolean(hashTokenHash),
      queryType: type,
      hashType,
      next,
    });

    if (authCode) {
      setStatus("Completing secure sign in…");
      supabaseClient.auth.exchangeCodeForSession(authCode).then(({ error: exchangeError }) => {
        if (exchangeError) {
          logAuthCallback("exchangeCodeForSession-error", { message: exchangeError.message });
          setError(exchangeError.message || "Failed to complete sign in.");
          return;
        }

        if (type === "invite") {
          setNeedsPasswordSetupCookie("1");
          router.replace(`/auth/set-password?next=${encodeURIComponent(next)}`);
          return;
        }

        router.replace(next);
      });
      return;
    }

    if (!tokenHash && hashTokenHash && hashOtpType) {
      setStatus("Verifying your invitation…");
      supabaseClient.auth.verifyOtp({ token_hash: hashTokenHash, type: hashOtpType }).then(({ error: verifyError }) => {
        if (verifyError) {
          logAuthCallback("verifyOtp-hash-error", { message: verifyError.message });
          setError(verifyError.message || "Failed to verify your invitation. Please request a new one.");
          return;
        }

        if (hashOtpType === "invite") {
          setNeedsPasswordSetupCookie("1");
          router.replace(`/auth/set-password?next=${encodeURIComponent(next)}`);
          return;
        }

        router.replace(next);
      });
      return;
    }

    if (!tokenHash && hashAccessToken && hashRefreshToken) {
      setStatus("Finalizing your secure session…");
      supabaseClient.auth
        .setSession({
          access_token: hashAccessToken,
          refresh_token: hashRefreshToken,
        })
        .then(({ error: sessionError }) => {
          if (sessionError) {
            logAuthCallback("setSession-error", { message: sessionError.message });
            setError(sessionError.message || "Failed to initialize your invitation session.");
            return;
          }

          if (hashType === "invite") {
            setNeedsPasswordSetupCookie("1");
            router.replace(`/auth/set-password?next=${encodeURIComponent(next)}`);
            return;
          }

          router.replace(next);
        });
      return;
    }

    if (!tokenHash || !type) {
      logAuthCallback("invalid-missing-token", {
        hasTokenHash: Boolean(tokenHash),
        type,
        hashLength: typeof window !== "undefined" ? window.location.hash.length : 0,
      });
      setError("Invalid or missing authentication token. Please request a new invitation.");
      return;
    }

    supabaseClient.auth.verifyOtp({ token_hash: tokenHash, type }).then(({ error: verifyError }) => {
      if (verifyError) {
        logAuthCallback("verifyOtp-query-error", { message: verifyError.message });
        setError(verifyError.message || "Failed to verify your invitation. Please request a new one.");
        return;
      }

      if (type === "invite") {
        setStatus("Invitation verified. Setting up your account…");
        setNeedsPasswordSetupCookie("1");
        router.replace(`/auth/set-password?next=${encodeURIComponent(next)}`);
      } else {
        router.replace(next);
      }
    });
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted px-4">
        <div className="text-center max-w-md">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 110 18A9 9 0 0112 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-destructive mb-2">Invitation Error</h1>
          <p className="text-muted-foreground mb-6 text-sm">{error}</p>
          <div className="flex items-center justify-center gap-4">
            <a href="/greeter/signin" className="text-primary underline text-sm">
              Go to greeter sign in
            </a>
            <a href="/administrator/signin" className="text-primary underline text-sm">
              Go to office sign in
            </a>
          </div>
          <button
            type="button"
            className="mt-4 text-xs text-muted-foreground underline"
            onClick={() => window.location.reload()}
          >
            Retry callback
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground text-sm">{status}</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-muted">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
