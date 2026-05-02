"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { auth } from "@/lib/supabase/browser";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { isAdminOrHeathrowUser } from "@/lib/adminUtils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function AdminSignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  

  // Clear any existing auth state when the page loads
  useEffect(() => {
    const checkAndClearAuth = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          const hasDashboardAccess = await isAdminOrHeathrowUser(currentUser.uid);
          if (!hasDashboardAccess) {
            await auth.signOut();
          } else {
            window.location.replace("/administrator/dashboard");
          }
        } catch (error) {
          await auth.signOut();
        }
      }
    };

    checkAndClearAuth();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error("Invalid email format");
      }

      // First, sign out any existing user
      await auth.signOut();

      // Attempt to sign in
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Check if user can access admin/heathrow dashboard
      const hasDashboardAccess = await isAdminOrHeathrowUser(userCredential.user.uid);
      
      if (!hasDashboardAccess) {
        await auth.signOut();
        throw new Error("Unauthorized access. Admin or Heathrow operations privileges required.");
      }

      // If we get here, the user is authenticated and can access dashboard
      toast.success("Successfully signed in");
      
      // Use replace instead of push to prevent back button issues
      window.location.replace("/administrator/dashboard");

    } catch (error: unknown) {
      console.error("Sign in error:", error);
      
      // Handle specific error cases
      const authError = error as { code?: string; message?: string };
      switch (authError.code) {
        case 'auth/invalid-email':
          setError("Invalid email address");
          toast.error("Invalid email address");
          break;
        case 'auth/user-disabled':
          setError("This account has been disabled");
          toast.error("This account has been disabled");
          break;
        case 'auth/user-not-found':
          setError("No account found with this email");
          toast.error("No account found with this email");
          break;
        case 'auth/wrong-password':
          setError("Incorrect password");
          toast.error("Incorrect password");
          break;
        case 'auth/invalid-credential':
          setError("Invalid email or password");
          toast.error("Invalid email or password");
          break;
        case 'auth/too-many-requests':
          setError("Too many failed attempts. Please try again later");
          toast.error("Too many failed attempts. Please try again later");
          break;
        default:
          const errorMessage = authError.message || "Failed to sign in";
          setError(errorMessage);
          toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetStatus(null);
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setShowResetModal(false);
      toast.success("A password reset email has been sent.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send reset email.";
      setResetStatus(message);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Admin Sign In</CardTitle>
          <CardDescription className="text-center">
            Sign in to access the administrator dashboard
          </CardDescription>
          <p className="text-center text-xs text-slate-500">
            No admin account yet? <Link href="/administrator/setup" className="font-medium text-blue-600 hover:underline">Create the first admin</Link>
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            <div>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                required
                disabled={isLoading}
                className={error ? "border-red-500" : ""}
              />
            </div>
            <div>
              <PasswordInput
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                required
                disabled={isLoading}
                className={error ? "border-red-500" : ""}
              />
            </div>
            <div className="flex justify-center">
              <button type="button" className="text-xs text-blue-500 hover:underline" onClick={() => setShowResetModal(true)}>
                Forgot Password?
              </button>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Dialog open={showResetModal} onOpenChange={setShowResetModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>Enter your email to receive a password reset link.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={resetEmail}
              onChange={e => setResetEmail(e.target.value)}
              required
            />
            <Button type="submit" className="w-full" disabled={resetLoading}>
              {resetLoading ? "Sending..." : "Send Reset Email"}
            </Button>
            {resetStatus && <p className="text-center text-sm text-gray-600">{resetStatus}</p>}
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
