"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/supabase";
import { onAuthStateChanged } from "@/lib/supabase-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, LogOut } from "lucide-react";

const statusLabel: Record<string, string> = {
  assigned: "Assigned",
  accepted: "Accepted",
  picked_up: "Picked Up",
  completed: "Completed",
  confirmed: "Confirmed",
  pending: "Pending",
};

const actionConfig: Record<string, { label: string; action: string } | null> = {
  assigned: { label: "Accept Job", action: "accept" },
  accepted: { label: "Confirm Pickup", action: "pickup" },
  picked_up: { label: "Complete Job", action: "complete" },
  completed: null,
  confirmed: null,
  pending: null,
};

export default function GreeterDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const loadJobs = useCallback(async (email?: string | null) => {
    if (!email) {
      setJobs([]);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/greeter/jobs?email=${encodeURIComponent(email)}`, {
        cache: "no-store",
      });
      const payload = response.ok ? await response.json() : [];
      setJobs(Array.isArray(payload) ? payload : []);
    } catch {
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        router.push("/user/signin");
        return;
      }

      loadJobs(nextUser.email);
    });

    return () => unsubscribe();
  }, [loadJobs, router]);

  const handleJobAction = async (jobId: string, action: string) => {
    if (!user?.email) return;

    try {
      setActiveJobId(jobId);
      await fetch(`/api/greeter/jobs/${jobId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: user.email, action }),
      });
      await loadJobs(user.email);
    } finally {
      setActiveJobId(null);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    router.push("/user/signin");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Greeter Dashboard</h1>
            <p className="text-sm text-slate-600">View assigned jobs and update live service progress.</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-slate-600">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading jobs...
          </div>
        ) : jobs.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No assigned jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">Once the office assigns a booking to your driver record, it will appear here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {jobs.map((job) => {
              const currentStatus = job.driver_status || job.status || "assigned";
              const nextAction = actionConfig[currentStatus] ?? null;

              return (
                <Card key={job.id}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0">
                    <div>
                      <CardTitle className="text-lg">{job.booking_ref || "Unreferenced Job"}</CardTitle>
                      <p className="text-sm text-slate-600">{job.full_name || "Guest passenger"}</p>
                    </div>
                    <Badge>{statusLabel[currentStatus] || currentStatus}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-slate-700">
                    <p><span className="font-semibold">Service:</span> {job.service_type}</p>
                    <p><span className="font-semibold">Pickup:</span> {job.pickup_location}</p>
                    <p><span className="font-semibold">Dropoff:</span> {job.dropoff_location || "N/A"}</p>
                    <p><span className="font-semibold">When:</span> {new Date(job.date_time).toLocaleString()}</p>
                    <p><span className="font-semibold">Passenger count:</span> {job.passengers || 1}</p>

                    {nextAction ? (
                      <div className="pt-2">
                        <Button
                          onClick={() => handleJobAction(job.id, nextAction.action)}
                          disabled={activeJobId === job.id}
                        >
                          {activeJobId === job.id ? "Updating..." : nextAction.label}
                        </Button>
                      </div>
                    ) : (
                      <p className="pt-2 font-medium text-emerald-700">This job has been completed.</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
