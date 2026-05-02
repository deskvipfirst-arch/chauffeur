"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/browser";

function CallbackHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const type = hashParams.get("type");

      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");
      const queryType = searchParams.get("type") || type || "invite";
      const next = searchParams.get("next") || "/";
      const isInviteNextPath = /^\/(greeter|administrator)\/signin$/i.test(next);

      try {
        if (code) {
          const { data } = await supabase.auth.exchangeCodeForSession(code);
          const needsPasswordSetup = data?.user?.user_metadata?.needs_password_setup === true;
          router.push(needsPasswordSetup || queryType === "invite" || isInviteNextPath ? "/auth/set-password" : next);
          return;
        }

        if (accessToken && refreshToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          router.push("/auth/set-password");
          return;
        }

        if (tokenHash) {
          await supabase.auth.verifyOtp({ token_hash: tokenHash, type: queryType as 'signup' | 'invite' | 'email_change' | 'recovery' });
          router.push(queryType === "invite" ? "/auth/set-password" : next);
          return;
        }

        setError("Invalid or missing authentication token");
      } catch (err: unknown) {
        console.error("[Callback]", err);
        const message = err instanceof Error ? err.message : "Authentication failed";
        setError(message);
      }
    };

    void handleCallback();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">Authentication Error</h1>
          <p className="text-gray-600">{error}</p>
          <button onClick={() => (window.location.href = "/")} className="mt-4 text-blue-600 underline">
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
        <p className="mt-2 text-gray-600">Verifying your invitation...</p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}

