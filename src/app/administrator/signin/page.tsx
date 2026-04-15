"use client";

import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { isAdminUser } from "@/lib/adminUtils";
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
      console.log("Checking initial auth state...");
      const currentUser = auth.currentUser;
      if (currentUser) {
        console.log("Found existing user:", currentUser.uid);
        try {
          const isAdmin = await isAdminUser(currentUser.uid);
          console.log("Is admin:", isAdmin);
          if (!isAdmin) {
            console.log("User is not admin, signing out...");
            await auth.signOut();
            // Clear session cookie
            document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          } else {
            console.log("User is admin, redirecting to dashboard...");
            // Set session cookie
            const token = await currentUser.getIdToken();
            document.cookie = `session=${token}; path=/;`;
            window.location.replace("/administrator/dashboard");
          }
        } catch (error) {
          console.error("Error checking admin status:", error);
          await auth.signOut();
          // Clear session cookie
          document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        }
      } else {
        console.log("No existing user found");
        // Clear session cookie
        document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
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
      console.log("Starting sign in process...");
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error("Invalid email format");
      }

      // First, sign out any existing user
      console.log("Signing out any existing user...");
      await auth.signOut();
      // Clear session cookie
      document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

      // Attempt to sign in
      console.log("Attempting to sign in...");
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Sign in successful, checking admin status...");
      
      // Check if user is admin
      const isAdmin = await isAdminUser(userCredential.user.uid);
      console.log("Is admin:", isAdmin);
      
      if (!isAdmin) {
        console.log("User is not admin, signing out...");
        await auth.signOut();
        // Clear session cookie
        document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        throw new Error("Unauthorized access. Admin privileges required.");
      }

      // If we get here, the user is authenticated and is an admin
      console.log("User is admin, setting session cookie and redirecting...");
      // Set session cookie
      const token = await userCredential.user.getIdToken();
      document.cookie = `session=${token}; path=/;`;
      
      toast.success("Successfully signed in as administrator");
      
      // Use replace instead of push to prevent back button issues
      window.location.replace("/administrator/dashboard");

    } catch (error: any) {
      console.error("Sign in error:", error);
      
      // Handle specific error cases
      switch (error.code) {
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
          const errorMessage = error.message || "Failed to sign in";
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
    } catch (err: any) {
      setResetStatus(err.message || "Failed to send reset email.");
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
              <Input
                type="password"
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