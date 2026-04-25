"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, getAccessToken } from "@/lib/supabase";
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
import { canGreeterSubmitInvoice, getInvoiceStatusLabel } from "@/lib/invoiceWorkflow";
import type { GreeterInvoice } from "@/types/admin";

export default function GreeterDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [submittingInvoiceId, setSubmittingInvoiceId] = useState<string | null>(null);
  const [flightStatuses, setFlightStatuses] = useState<Record<string, { status: string; terminal: string | null; source: string }>>({});
  const [invoicesByBooking, setInvoicesByBooking] = useState<Record<string, GreeterInvoice>>({});
  const [invoiceDrafts, setInvoiceDrafts] = useState<Record<string, { amount: string; notes: string }>>({});

  const loadJobs = useCallback(async (email?: string | null) => {
    if (!email) {
      setJobs([]);
      setIsLoading(false);
      return;
    }

    try {
      const token = await getAccessToken();
      const response = await fetch(`/api/greeter/jobs?email=${encodeURIComponent(email)}`, {
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const payload = response.ok ? await response.json() : [];
      setJobs(Array.isArray(payload) ? payload : []);
    } catch {
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadInvoices = useCallback(async (email?: string | null) => {
    if (!email) {
      setInvoicesByBooking({});
      return;
    }

    try {
      const token = await getAccessToken();
      const response = await fetch(`/api/greeter/invoices?email=${encodeURIComponent(email)}`, {
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const payload = response.ok ? await response.json() : [];
      const invoices = Array.isArray(payload) ? payload : [];
      setInvoicesByBooking(
        Object.fromEntries(invoices.map((invoice) => [String(invoice.booking_id), invoice as GreeterInvoice]))
      );
    } catch {
      setInvoicesByBooking({});
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        router.push("/greeter/signin");
        return;
      }

      const allowed = await isGreeterUser(nextUser.uid);
      if (!allowed) {
        const notice = buildUnauthorizedNotification("greeter");
        toast.error(notice.message);
        router.push("/user/dashboard");
        return;
      }

      await Promise.all([loadJobs(nextUser.email), loadInvoices(nextUser.email)]);
    });

    return () => unsubscribe();
  }, [loadInvoices, loadJobs, router]);

  useEffect(() => {
    if (!user?.email) return;

    const stopPolling = createPollingInterval(() => {
      void Promise.all([loadJobs(user.email), loadInvoices(user.email)]);
    }, 10000);
    const onVisibilityChange = () => {
      if (shouldRefreshOnVisibility(document.visibilityState)) {
        void Promise.all([loadJobs(user.email), loadInvoices(user.email)]);
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [loadInvoices, loadJobs, user?.email]);

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
      const token = await getAccessToken();
      const response = await fetch(`/api/greeter/jobs/${jobId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

  const handleSubmitInvoice = async (job: any) => {
    if (!user?.email) return;

    const draft = invoiceDrafts[job.id] || {
      amount: job.amount ? String(job.amount) : "",
      notes: "",
    };

    const amount = Number(draft.amount);
    if (!amount || Number.isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid invoice amount");
      return;
    }

    try {
      setSubmittingInvoiceId(job.id);
      const token = await getAccessToken();
      const response = await fetch("/api/greeter/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          email: user.email,
          bookingId: job.id,
          amount,
          notes: draft.notes,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        toast.error(result?.error || "Failed to submit invoice");
        return;
      }

      setInvoicesByBooking((current) => ({
        ...current,
        [job.id]: result,
      }));
      toast.success("Invoice submitted to office for review");
    } finally {
      setSubmittingInvoiceId(null);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    router.push("/user/signin");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
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
                  <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle className="text-lg">{job.booking_ref || "Unreferenced Job"}</CardTitle>
                      <p className="text-sm text-slate-600">{job.full_name || "Guest passenger"}</p>
                    </div>
                    <Badge className="w-fit">{getGreeterStatusLabel(currentStatus)}</Badge>
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

                    {(() => {
                      const invoice = invoicesByBooking[job.id];
                      const canSubmit = canGreeterSubmitInvoice(currentStatus, Boolean(invoice));
                      const draft = invoiceDrafts[job.id] || {
                        amount: job.amount ? String(job.amount) : "",
                        notes: "",
                      };

                      if (invoice) {
                        return (
                          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
                            <p className="font-semibold text-emerald-800">
                              Invoice {getInvoiceStatusLabel(invoice.office_status)} · £{Number(invoice.amount || 0).toFixed(2)}
                            </p>
                            {invoice.notes ? <p className="mt-1 text-xs text-emerald-700">{invoice.notes}</p> : null}
                          </div>
                        );
                      }

                      if (!canSubmit) {
                        return null;
                      }

                      return (
                        <div className="rounded-md border border-slate-200 p-3 space-y-2">
                          <p className="font-semibold text-slate-900">Submit invoice to office</p>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-full rounded-md border border-slate-300 px-3 py-2"
                            value={draft.amount}
                            onChange={(event) =>
                              setInvoiceDrafts((current) => ({
                                ...current,
                                [job.id]: { amount: event.target.value, notes: draft.notes },
                              }))
                            }
                            placeholder="Invoice amount"
                          />
                          <textarea
                            rows={3}
                            className="w-full rounded-md border border-slate-300 px-3 py-2"
                            value={draft.notes}
                            onChange={(event) =>
                              setInvoiceDrafts((current) => ({
                                ...current,
                                [job.id]: { amount: draft.amount, notes: event.target.value },
                              }))
                            }
                            placeholder="Optional notes for office review"
                          />
                          <Button
                            onClick={() => handleSubmitInvoice(job)}
                            disabled={submittingInvoiceId === job.id}
                            className="w-full sm:w-auto"
                          >
                            {submittingInvoiceId === job.id ? "Submitting..." : "Submit invoice"}
                          </Button>
                        </div>
                      );
                    })()}
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
