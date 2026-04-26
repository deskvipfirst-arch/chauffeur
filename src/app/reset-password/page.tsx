"use client";
import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/supabase/browser";
import { verifyPasswordResetCode, confirmPasswordReset } from "@/lib/supabase/browser";
import Link from "next/link";

function ResetPasswordPageContent() {
  const searchParams = useSearchParams();
  const oobCode = searchParams.get("oobCode") || "";
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (!oobCode) {
      setError("Invalid or missing reset code.");
      setIsVerifying(false);
      return;
    }
    verifyPasswordResetCode(auth, oobCode)
      .then((email) => {
        setEmail(email);
        setIsVerifying(false);
      })
      .catch(() => {
        setError("This password reset link is invalid or has expired.");
        setIsVerifying(false);
      });
  }, [oobCode]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus(null);
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setIsResetting(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setStatus("Your password has been reset. You can now sign in.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to reset password.";
      setError(message);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Reset Password</CardTitle>
        </CardHeader>
        <CardContent>
          {isVerifying ? (
            <p className="text-center">Verifying reset link...</p>
          ) : error ? (
            <div className="text-center text-red-500 mb-4">{error}</div>
          ) : status ? (
            <div className="text-center text-green-600 mb-4">{status}</div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Email</label>
                <Input type="email" value={email} disabled className="bg-gray-100" />
              </div>
              <div>
                <label className="block text-sm mb-1">New Password</label>
                <PasswordInput
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Confirm Password</label>
                <PasswordInput
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isResetting}>
                {isResetting ? "Resetting..." : "Reset Password"}
              </Button>
            </form>
          )}
          {status && (
            <div className="text-center mt-4">
              <Link href="/user/signin" className="text-blue-500 hover:underline">
                Go to Sign In
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordPageContent />
    </Suspense>
  );
} 
