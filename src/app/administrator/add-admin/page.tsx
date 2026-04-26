"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getAccessToken, supabase } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

type StaffRole = "greeter" | "admin" | "heathrow";

type InvitationRecord = {
  id: string;
  email: string;
  role: StaffRole;
  firstName: string | null;
  lastName: string | null;
  invitedAt: string | null;
  acceptedAt: string | null;
  status: "pending" | "accepted";
};

export default function AddAdminPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<StaffRole>("greeter");
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState<InvitationRecord[]>([]);
  const [activeInvitationAction, setActiveInvitationAction] = useState<string | null>(null);
  const router = useRouter();

  const loadPendingInvitations = async () => {
    try {
      setLoadingInvitations(true);
      const token = await getAccessToken();
      const response = await fetch("/api/admin/staff/invitations?status=pending", {
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Failed to load pending invitations");
      }

      setPendingInvitations(Array.isArray(result) ? result : []);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load pending invitations";
      toast.error(message);
      setPendingInvitations([]);
    } finally {
      setLoadingInvitations(false);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/administrator/signin");
        return;
      }

      const role = session.user.user_metadata?.role;
      if (role !== "admin") {
        toast.error("Unauthorized access");
        router.push("/administrator/signin");
        return;
      }

      setIsAuthorized(true);
      await loadPendingInvitations();
    };

    void checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        throw new Error("Invalid email format");
      }

      const token = await getAccessToken();
      const response = await fetch("/api/admin/staff/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email: normalizedEmail,
          phone,
          role,
        }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || "Failed to invite staff member");
      }

      toast.success(result?.message || "Staff invitation sent");
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setRole("greeter");
      await loadPendingInvitations();
    } catch (error: unknown) {
      console.error("Error inviting staff member:", error);
      const message = error instanceof Error ? error.message : "Failed to invite staff member";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendInvitation = async (invitation: InvitationRecord) => {
    try {
      setActiveInvitationAction(`resend:${invitation.id}`);
      const token = await getAccessToken();
      const response = await fetch(`/api/admin/staff/invitations/${invitation.id}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || "Failed to resend invitation");
      }

      toast.success(result?.message || `Invitation resent to ${invitation.email}`);
      await loadPendingInvitations();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to resend invitation";
      toast.error(message);
    } finally {
      setActiveInvitationAction(null);
    }
  };

  const handleRevokeInvitation = async (invitation: InvitationRecord) => {
    try {
      setActiveInvitationAction(`revoke:${invitation.id}`);
      const token = await getAccessToken();
      const response = await fetch(`/api/admin/staff/invitations/${invitation.id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || "Failed to revoke invitation");
      }

      toast.success(result?.message || `Invitation revoked for ${invitation.email}`);
      await loadPendingInvitations();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to revoke invitation";
      toast.error(message);
    } finally {
      setActiveInvitationAction(null);
    }
  };

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-gray-100 p-4 sm:p-6">
      <div className="w-full max-w-5xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Invite Staff</CardTitle>
            <CardDescription>
              Invite greeters and office staff without public signup. Existing accounts are upgraded in place.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input type="text" placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                <Input type="text" placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <Input type="tel" placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <label htmlFor="staff-role" className="mb-2 block text-sm font-medium text-slate-700">
                  Staff role
                </label>
                <select
                  id="staff-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as StaffRole)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="greeter">Greeter</option>
                  <option value="admin">Office Staff</option>
                  <option value="heathrow">Heathrow operations</option>
                </select>
              </div>
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                New staff receive an invitation email. If an account already exists for this email, the role is updated and no duplicate account is created.
              </p>
              <Button type="submit" className="w-full sm:w-auto" disabled={isLoading}>
                {isLoading ? "Sending invitation..." : "Invite Staff Member"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl font-semibold">Pending Invitations</CardTitle>
              <CardDescription>Track unaccepted staff invites and manage follow-up actions.</CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={loadPendingInvitations} disabled={loadingInvitations}>
              <RefreshCw className={cn("mr-2 h-4 w-4", loadingInvitations && "animate-spin")} />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {loadingInvitations ? (
              <p className="text-sm text-slate-500">Loading invitations...</p>
            ) : pendingInvitations.length === 0 ? (
              <p className="text-sm text-slate-500">No pending invitations.</p>
            ) : (
              <div className="space-y-3">
                {pendingInvitations.map((invitation) => {
                  const fullName = `${invitation.firstName || ""} ${invitation.lastName || ""}`.trim() || "No name provided";
                  const invitedAt = invitation.invitedAt ? new Date(invitation.invitedAt).toLocaleString() : "Unknown";
                  const resendBusy = activeInvitationAction === `resend:${invitation.id}`;
                  const revokeBusy = activeInvitationAction === `revoke:${invitation.id}`;

                  return (
                    <div key={invitation.id} className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="space-y-1">
                        <p className="font-medium text-slate-900">{fullName}</p>
                        <p className="text-sm text-slate-600">{invitation.email}</p>
                        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                          <span className="rounded-full bg-slate-100 px-2 py-1 capitalize">{invitation.role}</span>
                          <span>Invited: {invitedAt}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleResendInvitation(invitation)}
                          disabled={Boolean(activeInvitationAction)}
                        >
                          {resendBusy ? "Resending..." : "Resend"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRevokeInvitation(invitation)}
                          disabled={Boolean(activeInvitationAction)}
                        >
                          {revokeBusy ? "Revoking..." : "Revoke"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

