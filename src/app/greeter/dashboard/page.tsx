"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/supabase";
import { onAuthStateChanged } from "@/lib/supabase-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, LogOut } from "lucide-react";

import { getGreeterActionConfig, getGreeterStatusLabel } from "@/lib/greeterUi";
import { createPollingInterval, shouldRefreshOnVisibility } from "@/lib/liveJobs";
import { buildGreeterStatusNotification } from "@/lib/notifications";
import { toast } from "sonner";
import { isGreeterUser } from "@/lib/adminUtils";
import { buildUnauthorizedNotification } from "@/lib/notifications";
import { getPrimaryFlightNumber } from "@/lib/flightStatus";

export default function GreeterDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [flightStatuses, setFlightStatuses] = useState<Record<string, { status: string; terminal: string | null; source: string }>>({});

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
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        router.push("/user/signin");
        return;
      }

      const allowed = await isGreeterUser(nextUser.uid);
      if (!allowed) {
        const notice = buildUnauthorizedNotification("greeter");
        toast.error(notice.message);
        router.push("/user/dashboard");
        return;
      }

      loadJobs(nextUser.email);
    });

    return () => unsubscribe();
  }, [loadJobs, router]);

  useEffect(() => {
    if (!user?.email) return;

    const stopPolling = createPollingInterval(() => loadJobs(user.email), 10000);
    const onVisibilityChange = () => {
      if (shouldRefreshOnVisibility(document.visibilityState)) {
        void loadJobs(user.email);
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [loadJobs, user?.email]);

  useEffect(() => {
    const loadFlightStatuses = async () => {
      const flights = Array.from(new Set(jobs.map((job) => getPrimaryFlightNumber(job)).filter(Boolean)));
      if (flights.length === 0) {
        setFlightStatuses({});
        return;
      }

      const entries = await Promise.all(
        flights.map(async (flight) => {
          try {
            const response = await fetch(`/api/flight-status?flight=${encodeURIComponent(flight)}`, { cache: "no-store" });
            const payload = response.ok ? await response.json() : null;
            return [flight, { status: payload?.status || "Unknown", terminal: payload?.terminal || null, source: payload?.source || "fallback" }] as const;
          } catch {
            return [flight, { status: "Unknown", terminal: null, source: "fallback" }] as const;
          }
        })
      );

      setFlightStatuses(Object.fromEntries(entries));
    };

    void loadFlightStatuses();
  }, [jobs]);

  const handleJobAction = async (jobId: string, action: string) => {
    if (!user?.email) return;

    try {
      setActiveJobId(jobId);
      const response = await fetch(`/api/greeter/jobs/${jobId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: user.email, action }),
      });

      const result = response.ok ? await response.json() : null;
      if (result) {
        const notice = buildGreeterStatusNotification(result.driver_status || result.status || action, result.booking_ref || jobId);
        toast.success(notice.message);
      }

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
              const nextAction = getGreeterActionConfig(currentStatus);

              return (
                <Card key={job.id}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0">
                    <div>
                      <CardTitle className="text-lg">{job.booking_ref || "Unreferenced Job"}</CardTitle>
                      <p className="text-sm text-slate-600">{job.full_name || "Guest passenger"}</p>
                    </div>
                    <Badge>{getGreeterStatusLabel(currentStatus)}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-slate-700">
                    <p><span className="font-semibold">Service:</span> {job.service_type}</p>
                    <p><span className="font-semibold">Pickup:</span> {job.pickup_location}</p>
                    <p><span className="font-semibold">Dropoff:</span> {job.dropoff_location || "N/A"}</p>
                    <p><span className="font-semibold">When:</span> {new Date(job.date_time).toLocaleString()}</p>
                    <p><span className="font-semibold">Passenger count:</span> {job.passengers || 1}</p>
                    {(() => {
                      const flight = getPrimaryFlightNumber(job);
                      if (!flight) return null;
                      const info = flightStatuses[flight];
                      return (
                        <p><span className="font-semibold">Flight:</span> {flight} · {info?.status || "Loading"}{info?.terminal ? ` (${info.terminal})` : ""} · {info?.source === "remote" ? "Live" : "Simulated"}</p>
                      );
                    })()}

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
