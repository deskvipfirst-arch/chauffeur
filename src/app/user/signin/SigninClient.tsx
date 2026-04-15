"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Label } from "@radix-ui/react-label";
import { Icons } from "@/components/ui/icons";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

const logoURL = "/favicon.ico";

export default function SigninClient({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const router = useRouter();
  const errorMessage = (searchParams?.error as string) || null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      
      // Check if user came from booking page
      const fromBooking = searchParams?.from === 'booking';
      if (fromBooking) {
        router.push('/booking');
      } else {
        router.push('/user/dashboard');
      }
    } catch (error: any) {
      // Handle specific Firebase auth errors
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
          setError("Failed to sign in. Please try again.");
          toast.error("Failed to sign in. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError(null);

    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      
      // Check if user came from booking page
      const fromBooking = searchParams?.from === 'booking';
      if (fromBooking) {
        router.push('/booking');
      } else {
        router.push('/user/dashboard');
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetStatus(null);
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast.success("A password reset email has been sent.");
      // Wait for 3 seconds before closing the modal
      setTimeout(() => {
        setShowResetModal(false);
        setResetEmail("");
      }, 3000);
    } catch (err: any) {
      // Handle specific Firebase auth errors
      switch (err.code) {
        case 'auth/invalid-email':
          setResetStatus("Invalid email address");
          toast.error("Invalid email address");
          break;
        case 'auth/user-not-found':
          setResetStatus("No account found with this email");
          toast.error("No account found with this email");
          break;
        case 'auth/too-many-requests':
          setResetStatus("Too many attempts. Please try again later");
          toast.error("Too many attempts. Please try again later");
          break;
        default:
          setResetStatus("Failed to send reset email. Please try again.");
          toast.error("Failed to send reset email. Please try again.");
      }
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-muted flex flex-col items-center justify-center">
      <div className="absolute top-20 left-50 md:block hidden">
        <Link href={"/"} className="flex items-center justify-center">
          <Image src={logoURL} alt="" height={48} width={48} />
          <Label className="text-[32px] font-bold tracking-wide ml-4">
            <span className="text-[#1D3557]">London</span>
            <span className="text-[#DAA520]">Chauffeur</span>
            <span className="text-[#1D3557]">Hire</span>
          </Label>
        </Link>
      </div>
      <div className="md:hidden flex items-center justify-center mb-8">
        <Link href={"/"}>
          <Image src={logoURL} alt="" height={48} width={48} />
        </Link>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-4 text-center">Sign In</h2>

        <div className="mb-6">
          <Button
            variant="outline"
            type="button"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Icons.google className="mr-2 h-4 w-4" />
            )}
            Continue with Google
          </Button>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-muted-foreground">
              Or sign in with email
            </span>
          </div>
        </div>

        <form onSubmit={handleSignIn} className="space-y-4">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="flex justify-center">
            <button type="button" className="text-xs text-blue-500 hover:underline" onClick={() => setShowResetModal(true)}>
              Forgot Password?
            </button>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>

          {error && <p className="text-red-500 text-center">{error}</p>}
          {errorMessage && (
            <p className="text-red-500 text-center">
              {errorMessage === "user_creation_failed"
                ? "Failed to create user profile. Please try again."
                : errorMessage}
            </p>
          )}

          <p className="text-center">
            Don&apos;t have an account?{" "}
            <Link href="/user/signup" className="text-blue-500 hover:underline">
              Sign Up
            </Link>
          </p>
        </form>
      </div>

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
            {resetStatus && (
              <div
                className={`text-center text-sm px-2 py-1 rounded ${
                  resetStatus.toLowerCase().includes('sent')
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {resetStatus}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={resetLoading}>
              {resetLoading ? "Sending..." : "Send Reset Email"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}