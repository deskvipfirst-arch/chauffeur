"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Verifying your invitation…");

  useEffect(() => {
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type") as
      | "invite"
      | "recovery"
      | "email"
      | "magiclink"
      | "signup"
      | null;
    const next = searchParams.get("next") || "/";

    const hashParams = typeof window !== "undefined"
      ? new URLSearchParams(window.location.hash.replace(/^#/, ""))
      : new URLSearchParams();
    const hashAccessToken = hashParams.get("access_token");
    const hashRefreshToken = hashParams.get("refresh_token");
    const hashType = hashParams.get("type") as "invite" | null;

    if (!tokenHash && hashAccessToken && hashRefreshToken) {
      setStatus("Finalizing your secure session…");
      supabase.auth
        .setSession({
          access_token: hashAccessToken,
          refresh_token: hashRefreshToken,
        })
        .then(({ error: sessionError }) => {
          if (sessionError) {
            setError(sessionError.message || "Failed to initialize your invitation session.");
            return;
          }

          if (hashType === "invite") {
            router.replace(`/auth/set-password?next=${encodeURIComponent(next)}`);
            return;
          }

          router.replace(next);
        });
      return;
    }

    if (!tokenHash || !type) {
      setError("Invalid or missing authentication token. Please request a new invitation.");
      return;
    }

    supabase.auth.verifyOtp({ token_hash: tokenHash, type }).then(({ error: verifyError }) => {
      if (verifyError) {
        setError(verifyError.message || "Failed to verify your invitation. Please request a new one.");
        return;
      }

      if (type === "invite") {
        setStatus("Invitation verified. Setting up your account…");
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
          <a href="/greeter/signin" className="text-primary underline text-sm">
            Back to sign in
          </a>
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
