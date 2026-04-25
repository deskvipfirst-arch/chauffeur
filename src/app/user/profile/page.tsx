"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db, getCurrentUser } from "@/lib/supabase";
import { doc, getDoc, setDoc } from "@/lib/supabase-db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "@/components/ui/icons";
import { updateProfile } from "@/lib/supabase-auth";
import { getUserDisplayName, getUserFirstName } from "@/lib/userDisplay";

interface UserProfile {
  email: string | null;
  firstName: string;
  lastName: string;
  phone: string;
  displayName: string;
  photoURL: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    const fetchUserData = async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.push("/user/signin");
        return;
      }

      try {
        const profileDoc = await getDoc(doc(db, "profiles", user.uid));
        const fallbackDisplayName = getUserDisplayName(null, user);
        const nameParts = fallbackDisplayName.split(/\s+/).filter(Boolean);
        const fallbackFirstName = getUserFirstName(null, user);
        const fallbackLastName = nameParts.slice(1).join(" ");

        if (profileDoc.exists()) {
          const data = profileDoc.data() as UserProfile;
          setFormData({
            firstName: data.firstName || fallbackFirstName,
            lastName: data.lastName || fallbackLastName,
            email: user.email || "",
            phone: data.phone || "",
          });
        } else {
          setFormData({
            firstName: fallbackFirstName,
            lastName: fallbackLastName,
            email: user.email || "",
            phone: "",
          });
        }
      } catch (err) {
        setError("Failed to fetch profile data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    const user = await getCurrentUser();
    if (!user) {
      router.push("/user/signin");
      return;
    }

    try {
      await setDoc(doc(db, "profiles", user.uid), {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: user.email || formData.email,
        phone: formData.phone,
        role: "user",
      });

      // Update display name in Supabase Auth
      await updateProfile(user, {
        displayName: `${formData.firstName} ${formData.lastName}`,
      });

      setSuccess("Profile updated successfully!");
    } catch (err) {
      setError("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted p-4 sm:p-6">
        <div className="container mx-auto">
          <div className="flex justify-center items-center h-64">
            <Icons.spinner className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted p-4 sm:p-6">
      <div className="container mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold sm:text-4xl">Profile Settings</h1>
          <p className="mt-2 text-base text-muted-foreground sm:text-lg">
            Hello, {formData.firstName || getUserFirstName(null, { email: formData.email })}! Manage your profile information here.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
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

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-muted"
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

              {error && <p className="text-red-500">{error}</p>}
              {success && <p className="text-green-500">{success}</p>}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/user/dashboard")}
                >
                  Back to Dashboard
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 