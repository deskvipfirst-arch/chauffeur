"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, getAccessToken } from "@/lib/supabase/browser";
import { onAuthStateChanged } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut, RefreshCw, Plane, MapPin, Users, Clock, CheckCircle2, ChevronDown, ChevronUp, FileText, ArrowRight } from "lucide-react";

import { getGreeterActionConfig, getGreeterStatusLabel } from "@/lib/greeterUi";
import { createPollingInterval, shouldRefreshOnVisibility } from "@/lib/liveJobs";
import { buildGreeterStatusNotification } from "@/lib/notifications";
import { toast } from "sonner";
import { isGreeterUser } from "@/lib/adminUtils";
import { buildUnauthorizedNotification } from "@/lib/notifications";
import { getPrimaryFlightNumber } from "@/lib/flightStatus";
import { canGreeterSubmitInvoice, getInvoiceStatusLabel } from "@/lib/invoiceWorkflow";
import type { GreeterInvoice } from "@/types/admin";
import type { CompatUser } from "@/lib/supabase/browser";

type GreeterJob = {
  id: string;
  booking_ref?: string;
  full_name?: string;
  service_type?: string;
  pickup_location?: string;
  dropoff_location?: string | null;
  date_time?: string;
  passengers?: number;
  amount?: number | string;
  status?: string;
  driver_status?: string;
  flight_number_arrival?: string | null;
  flight_number_departure?: string | null;
  arrival_flight?: string | null;
  departure_flight?: string | null;
} & Record<string, unknown>;

// ── Status config ────────────────────────────────────────────────────────────
const STATUS_STEPS = ["assigned", "accepted", "picked_up", "completed"] as const;

type StatusStep = (typeof STATUS_STEPS)[number];

function getStatusStepIndex(status: string): number {
  const idx = STATUS_STEPS.indexOf(status as StatusStep);
  return idx === -1 ? 0 : idx;
}

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    assigned: "bg-amber-100 text-amber-800 border-amber-300",
    accepted: "bg-blue-100 text-blue-800 border-blue-300",
    picked_up: "bg-violet-100 text-violet-800 border-violet-300",
    completed: "bg-emerald-100 text-emerald-800 border-emerald-300",
    confirmed: "bg-emerald-100 text-emerald-800 border-emerald-300",
    cancelled: "bg-red-100 text-red-700 border-red-300",
    pending: "bg-slate-100 text-slate-600 border-slate-300",
  };
  return map[status] ?? "bg-slate-100 text-slate-600 border-slate-300";
}

function getCardAccent(status: string): string {
  const map: Record<string, string> = {
    assigned: "border-l-amber-400",
    accepted: "border-l-blue-500",
    picked_up: "border-l-violet-500",
    completed: "border-l-emerald-500",
    confirmed: "border-l-emerald-500",
    cancelled: "border-l-red-400",
    pending: "border-l-slate-300",
  };
  return map[status] ?? "border-l-slate-300";
}

function getStepLabel(step: string): string {
  const labels: Record<string, string> = {
    assigned: "Assigned",
    accepted: "Accepted",
    picked_up: "Picked Up",
    completed: "Done",
  };
  return labels[step] ?? step;
}

function getGreeterInitials(email: string): string {
  const parts = email.split("@")[0].split(/[._-]/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function GreeterDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<CompatUser | null>(null);
  const [jobs, setJobs] = useState<GreeterJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [submittingInvoiceId, setSubmittingInvoiceId] = useState<string | null>(null);
  const [flightStatuses, setFlightStatuses] = useState<Record<string, { status: string; terminal: string | null; source: string }>>({});
  const [invoicesByBooking, setInvoicesByBooking] = useState<Record<string, GreeterInvoice>>({});
  const [invoiceDrafts, setInvoiceDrafts] = useState<Record<string, { amount: string; notes: string }>>({});
  const [expandedInvoice, setExpandedInvoice] = useState<Record<string, boolean>>({});

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
      setJobs(Array.isArray(payload) ? (payload as GreeterJob[]) : []);
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

  const handleSubmitInvoice = async (job: GreeterJob) => {
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

  const handleManualRefresh = async () => {
    if (!user?.email || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await Promise.all([loadJobs(user.email), loadInvoices(user.email)]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    router.push("/user/signin");
  };

  // ── Derived stats ─────────────────────────────────────────────────────────
  const totalJobs = jobs.length;
  const completedJobs = jobs.filter((j) => (j.driver_status || j.status) === "completed").length;
  const activeJobs = jobs.filter((j) => {
    const s = j.driver_status || j.status || "";
    return ["accepted", "picked_up"].includes(s);
  }).length;
  const pendingJobs = jobs.filter((j) => (j.driver_status || j.status || "assigned") === "assigned").length;

  const todayStr = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const initials = user?.email ? getGreeterInitials(user.email) : "VG";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-100">
      {/* ── Top header bar ─────────────────────────────────────────────── */}
      <header className="bg-slate-900 text-white">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            {/* Left: brand + identity */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-slate-900">
                {initials}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">VIP Greeters</p>
                <p className="text-sm font-medium text-slate-200 leading-tight">{user?.email ?? "Loading…"}</p>
              </div>
            </div>

            {/* Right: date + actions */}
            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-slate-400 sm:block">{todayStr}</span>
              <button
                onClick={() => void handleManualRefresh()}
                disabled={isRefreshing}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-700 hover:text-white disabled:opacity-40"
                aria-label="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={() => void handleLogout()}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Stats strip ────────────────────────────────────────────────── */}
      <div className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid grid-cols-4 divide-x divide-slate-100">
            {[
              { label: "Total", value: totalJobs, color: "text-slate-700" },
              { label: "Pending", value: pendingJobs, color: "text-amber-600" },
              { label: "Active", value: activeJobs, color: "text-blue-600" },
              { label: "Done", value: completedJobs, color: "text-emerald-600" },
            ].map(({ label, value, color }) => (
              <div key={label} className="py-3 text-center">
                <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {isLoading ? (
          /* Loading skeletons */
          <div className="space-y-4">
            {[1, 2].map((n) => (
              <div key={n} className="h-48 animate-pulse rounded-xl bg-white shadow-sm" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-20 text-center shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <CheckCircle2 className="h-8 w-8 text-slate-400" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-800">No jobs assigned yet</h2>
            <p className="mt-1 max-w-xs text-sm text-slate-500">
              The office will assign bookings to you. They will appear here in real time.
            </p>
          </div>
        ) : (
          /* Job list */
          <div className="space-y-4">
            {jobs.map((job) => {
              const currentStatus = job.driver_status || job.status || "assigned";
              const nextAction = getGreeterActionConfig(currentStatus);
              const stepIdx = getStatusStepIndex(currentStatus);
              const flight = getPrimaryFlightNumber(job);
              const flightInfo = flight ? flightStatuses[flight] : null;
              const invoice = invoicesByBooking[job.id];
              const canSubmit = canGreeterSubmitInvoice(currentStatus, Boolean(invoice));
              const draft = invoiceDrafts[job.id] ?? {
                amount: job.amount ? String(job.amount) : "",
                notes: "",
              };
              const isInvoiceExpanded = expandedInvoice[job.id] ?? false;

              return (
                <article
                  key={job.id}
                  className={`overflow-hidden rounded-xl border-l-4 bg-white shadow-sm transition-shadow hover:shadow-md ${getCardAccent(currentStatus)}`}
                >
                  {/* Card header */}
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold tracking-wide text-slate-800">
                          {job.booking_ref || "—"}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${getStatusColor(currentStatus)}`}
                        >
                          {getGreeterStatusLabel(currentStatus)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-base font-semibold text-slate-900">
                        {job.full_name || "Guest passenger"}
                      </p>
                    </div>

                    {/* Service type pill */}
                    {job.service_type && (
                      <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        {job.service_type}
                      </span>
                    )}
                  </div>

                  {/* Card body */}
                  <div className="px-5 py-4 space-y-4">
                    {/* Date + passengers row */}
                    <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                        <span>
                          {job.date_time
                            ? new Date(job.date_time).toLocaleString("en-GB", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "TBC"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="h-4 w-4 shrink-0 text-slate-400" />
                        <span>{job.passengers ?? 1} passenger{(job.passengers ?? 1) !== 1 ? "s" : ""}</span>
                      </div>
                      {flight && (
                        <div className="flex items-center gap-1.5">
                          <Plane className="h-4 w-4 shrink-0 text-slate-400" />
                          <span className="font-medium">{flight}</span>
                          {flightInfo && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                flightInfo.source === "remote"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {flightInfo.status}
                              {flightInfo.terminal ? ` · T${flightInfo.terminal}` : ""}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Route */}
                    <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                        <span className="truncate font-medium text-slate-800">{job.pickup_location || "—"}</span>
                        <ArrowRight className="hidden h-3.5 w-3.5 shrink-0 text-slate-400 sm:block" />
                        <span className="truncate text-slate-600">{job.dropoff_location || "No dropoff"}</span>
                      </div>
                    </div>

                    {/* Progress timeline */}
                    <div className="py-1">
                      <div className="flex items-center">
                        {STATUS_STEPS.map((step, i) => {
                          const done = i < stepIdx;
                          const current = i === stepIdx;
                          return (
                            <div key={step} className="flex flex-1 items-center last:flex-none">
                              <div className="flex flex-col items-center">
                                <div
                                  className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
                                    done
                                      ? "border-emerald-500 bg-emerald-500 text-white"
                                      : current
                                      ? "border-amber-500 bg-amber-50 text-amber-600"
                                      : "border-slate-200 bg-white text-slate-300"
                                  }`}
                                >
                                  {done ? "✓" : i + 1}
                                </div>
                                <span
                                  className={`mt-1 text-[10px] font-medium ${
                                    done
                                      ? "text-emerald-600"
                                      : current
                                      ? "text-amber-600"
                                      : "text-slate-400"
                                  }`}
                                >
                                  {getStepLabel(step)}
                                </span>
                              </div>
                              {i < STATUS_STEPS.length - 1 && (
                                <div
                                  className={`mb-4 h-0.5 flex-1 transition-colors ${
                                    i < stepIdx ? "bg-emerald-400" : "bg-slate-200"
                                  }`}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Primary action */}
                    {nextAction ? (
                      <Button
                        onClick={() => void handleJobAction(job.id, nextAction.action)}
                        disabled={activeJobId === job.id}
                        className="w-full bg-slate-900 text-white hover:bg-slate-700 sm:w-auto sm:min-w-[180px]"
                        size="lg"
                      >
                        {activeJobId === job.id ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating…</>
                        ) : (
                          nextAction.label
                        )}
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Job completed
                      </div>
                    )}

                    {/* Invoice section */}
                    {invoice ? (
                      /* Submitted invoice status */
                      <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        <div>
                          <p className="text-sm font-semibold text-emerald-800">
                            Invoice {getInvoiceStatusLabel(invoice.office_status)} · £{Number(invoice.amount || 0).toFixed(2)}
                          </p>
                          {invoice.notes ? (
                            <p className="mt-0.5 text-xs text-emerald-700">{invoice.notes}</p>
                          ) : null}
                        </div>
                      </div>
                    ) : canSubmit ? (
                      /* Invoice submission toggle */
                      <div className="rounded-lg border border-slate-200 bg-slate-50">
                        <button
                          onClick={() =>
                            setExpandedInvoice((prev) => ({ ...prev, [job.id]: !prev[job.id] }))
                          }
                          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-slate-500" />
                            Submit invoice to office
                          </div>
                          {isInvoiceExpanded ? (
                            <ChevronUp className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          )}
                        </button>

                        {isInvoiceExpanded && (
                          <div className="space-y-3 border-t border-slate-200 px-4 pb-4 pt-3">
                            <div>
                              <label className="mb-1 block text-xs font-medium text-slate-600">
                                Amount (£)
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                                value={draft.amount}
                                onChange={(e) =>
                                  setInvoiceDrafts((cur) => ({
                                    ...cur,
                                    [job.id]: { amount: e.target.value, notes: draft.notes },
                                  }))
                                }
                                placeholder="0.00"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-slate-600">
                                Notes <span className="font-normal text-slate-400">(optional)</span>
                              </label>
                              <textarea
                                rows={3}
                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                                value={draft.notes}
                                onChange={(e) =>
                                  setInvoiceDrafts((cur) => ({
                                    ...cur,
                                    [job.id]: { amount: draft.amount, notes: e.target.value },
                                  }))
                                }
                                placeholder="Any notes for the office…"
                              />
                            </div>
                            <Button
                              onClick={() => void handleSubmitInvoice(job)}
                              disabled={submittingInvoiceId === job.id}
                              className="w-full bg-slate-900 text-white hover:bg-slate-700"
                            >
                              {submittingInvoiceId === job.id ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</>
                              ) : (
                                "Submit invoice"
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

