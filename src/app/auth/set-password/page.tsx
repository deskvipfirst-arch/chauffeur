"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/browser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";

function getRoleRedirect(role: string) {
  if (role === "greeter") return "/greeter/signin";
  if (role === "admin" || role === "heathrow") return "/administrator/signin";
  return "/user/signin";
}

function SetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const next = searchParams.get("next") || "/greeter/signin";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  const resolveNextDestination = async () => {
    const { data } = await supabaseClient.auth.getUser();
    const role = String(data.user?.user_metadata?.role || "").trim().toLowerCase();
    return next === "/" || next === "/greeter/signin" ? getRoleRedirect(role) : next;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Your invite session has expired. Please request a new invitation email.");
      }

      const { error: updateError } = await supabaseClient.auth.updateUser({
        password,
        data: {
          needs_password_setup: false,
        },
      });
      if (updateError) throw updateError;

      if (typeof document !== "undefined") {
        document.cookie = "vip_needs_password_setup=; path=/; max-age=0; samesite=lax";
      }

      const destination = await resolveNextDestination();
      setDone(true);
      setTimeout(() => router.replace(destination), 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to set password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="text-xs font-bold tracking-widest uppercase text-amber-600 mb-1">
            VIP Greeters
          </div>
          <CardTitle className="text-2xl font-bold">Welcome to the Team</CardTitle>
          <p className="text-muted-foreground text-sm mt-1">
            Set a password to activate your account.
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          {done ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-semibold text-green-700">Password set successfully!</p>
              <p className="text-sm mt-1 text-muted-foreground">Redirecting you to sign in…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                  {error}
                </div>
              )}
              <div className="space-y-1">
                <label className="block text-sm font-medium">New Password</label>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium">Confirm Password</label>
                <PasswordInput
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat your password"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Saving…" : "Set Password & Continue"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-muted">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      }
    >
      <SetPasswordContent />
    </Suspense>
  );
}

