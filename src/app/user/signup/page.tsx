"use client";
import React, { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { createUserWithEmailAndPassword, syncUserProfile, updateProfile } from "@/lib/supabase-auth";
import { auth } from "@/lib/supabase";
import { getSignupErrorMessage, loadStoredBookingDraft, saveStoredBookingDraft, splitFullName } from "@/lib/bookingFlow";

function SignUpContent() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromBooking = searchParams.get("from") === "booking";

  useEffect(() => {
    const draft = loadStoredBookingDraft();
    if (!draft) return;

    const name = splitFullName(draft.fullName || "");
    setFormData((prev) => ({
      ...prev,
      firstName: prev.firstName || name.firstName,
      lastName: prev.lastName || name.lastName,
      email: prev.email || draft.email || "",
      phone: prev.phone || draft.phone || "",
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const redirectPath = fromBooking
        ? "/user/signin?from=booking&message=account_created"
        : "/user/signin?message=account_created";
      const emailRedirectTo = typeof window !== "undefined"
        ? `${window.location.origin}${redirectPath}`
        : undefined;

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password,
        {
          emailRedirectTo,
          userData: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            displayName: `${formData.firstName} ${formData.lastName}`.trim(),
            role: "user",
          },
        }
      );

      await updateProfile(userCredential.user, {
        displayName: `${formData.firstName} ${formData.lastName}`.trim(),
      });

      if (userCredential.session) {
        try {
          await syncUserProfile(userCredential.user, {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone,
            role: "user",
          });
        } catch (profileError) {
          console.warn("Profile setup warning:", profileError);
        }
      }

      saveStoredBookingDraft({
        ...loadStoredBookingDraft(),
        fullName: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        phone: formData.phone,
      });

      const message = userCredential.session
        ? "Account created successfully."
        : "Account created. Please check your inbox and spam folder, then sign in to continue your booking.";

      setSuccessMessage(message);
      toast.success(message);

      router.push(
        userCredential.session
          ? fromBooking
            ? "/booking"
            : "/user/dashboard"
          : fromBooking
            ? "/user/signin?from=booking&message=account_created"
            : "/user/signin?message=account_created"
      );
    } catch (err: any) {
      console.error("Error signing up:", err);
      const message = getSignupErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo and Company Name */}
        <div className="flex items-center justify-center mb-8">
          <Link href="/" className="flex items-center">
            <Image src="/favicon.ico" alt="Logo" width={40} height={40} className="mr-2" />
            <span className="text-2xl font-bold">
              <span className="text-[#1D3557]">VIP</span>
              <span className="text-[#DAA520]">Greeters</span>
            </span>
          </Link>
        </div>

        {/* Sign Up Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-center mb-6">Create an Account</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <PasswordInput
                  id="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <PasswordInput
                  id="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}
            {successMessage && <p className="text-green-600 text-sm">{successMessage}</p>}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Creating Account..." : "Sign Up"}
            </Button>

            <p className="text-center text-sm text-gray-600">
              Already have an account?{" "}
              <Link href={fromBooking ? "/user/signin?from=booking" : "/user/signin"} className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-muted flex items-center justify-center">Loading...</div>}>
      <SignUpContent />
    </Suspense>
  );
}