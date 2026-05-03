"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, getAccessToken } from "@/lib/supabase/browser";
import { onAuthStateChanged } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Loader2,
  LogOut,
  RefreshCw,
  Plane,
  MapPin,
  Users,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  ArrowRight,
  CalendarDays,
  Navigation,
} from "lucide-react";

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

type AvailabilityMode = "unavailable" | "all_day" | "range";
type AvailabilityDayDraft = {
  mode: AvailabilityMode;
  startTime: string;
  endTime: string;
};

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

function buildMonthDays(monthKey: string) {
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return [] as string[];
  }

  const lastDay = new Date(year, month, 0).getDate();
  const days: string[] = [];
  for (let day = 1; day <= lastDay; day += 1) {
    days.push(`${year}-${pad2(month)}-${pad2(day)}`);
  }
  return days;
}

function toAvailabilityDraft(input?: { available?: boolean; mode?: "all_day" | "range"; startTime?: string | null; endTime?: string | null; }) {
  if (!input?.available) {
    return { mode: "unavailable", startTime: "09:00", endTime: "17:00" } as AvailabilityDayDraft;
  }

  if (input.mode === "range") {
    return {
      mode: "range",
      startTime: input.startTime || "09:00",
      endTime: input.endTime || "17:00",
    } as AvailabilityDayDraft;
  }

  return { mode: "all_day", startTime: "09:00", endTime: "17:00" } as AvailabilityDayDraft;
}

function formatPlannerDate(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`);
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

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

function getCardHighlight(status: string): string {
  const map: Record<string, string> = {
    assigned: "bg-amber-50/60",
    accepted: "bg-blue-50/60",
    picked_up: "bg-violet-50/60",
    completed: "bg-emerald-50/60",
  };
  return map[status] ?? "bg-white";
}

function getStepLabel(step: string): string {
  const labels: Record<string, string> = {
    assigned: "Assigned",
    accepted: "Accepted",
    picked_up: "Picked up",
    completed: "Done",
  };
  return labels[step] ?? step;
}

function getGreeterName(user: CompatUser | null): string {
  const raw = user?.displayName?.trim() || user?.email?.split("@")[0] || "Greeter";
  return raw
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatCurrency(value?: number | string): string {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return "TBC";
  }
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatJobTime(dateTime?: string): string {
  if (!dateTime) return "TBC";
  return new Date(dateTime).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatJobDate(dateTime?: string): string {
  if (!dateTime) return "Schedule pending";
  return new Date(dateTime).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusTone(status: string): string {
  if (["accepted", "picked_up"].includes(status)) return "text-blue-600";
  if (status === "completed") return "text-emerald-600";
  return "text-amber-600";
}

function StatCard({
  icon,
  label,
  value,
  tone = "text-slate-900",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <Card className="border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700 sm:h-11 sm:w-11">
          {icon}
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500 sm:text-[11px]">{label}</div>
          <div className={`text-xl font-semibold sm:text-2xl ${tone}`}>{value}</div>
        </div>
      </div>
    </Card>
  );
}

function DetailRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0 last:pb-0">
      <span className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{k}</span>
      <span className="max-w-[62%] text-right text-sm text-slate-800">{v}</span>
    </div>
  );
}

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
  const [availabilityStatus, setAvailabilityStatus] = useState<"active" | "inactive">("inactive");
  const [isUpdatingAvailability, setIsUpdatingAvailability] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => toMonthKey(new Date()));
  const [availabilityPlanner, setAvailabilityPlanner] = useState<Record<string, AvailabilityDayDraft>>({});
  const [scheduleWindowStart, setScheduleWindowStart] = useState(0);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [savingScheduleDate, setSavingScheduleDate] = useState<string | null>(null);

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

  const loadAvailability = useCallback(async (email?: string | null) => {
    if (!email) {
      setAvailabilityStatus("inactive");
      return;
    }

    try {
      const token = await getAccessToken();
      const response = await fetch(`/api/greeter/availability?email=${encodeURIComponent(email)}`, {
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as { status?: string };
      const nextStatus = payload?.status === "active" ? "active" : "inactive";
      setAvailabilityStatus(nextStatus);
    } catch {
      setAvailabilityStatus("inactive");
    }
  }, []);

  const loadAvailabilitySchedule = useCallback(async (email?: string | null, monthKey?: string) => {
    if (!email || !monthKey) {
      setAvailabilityPlanner({});
      return;
    }

    const monthDays = buildMonthDays(monthKey);
    if (monthDays.length === 0) {
      setAvailabilityPlanner({});
      return;
    }

    const from = monthDays[0];
    const to = monthDays[monthDays.length - 1];
    setIsLoadingSchedule(true);

    try {
      const token = await getAccessToken();
      const response = await fetch(
        `/api/greeter/availability/schedule?email=${encodeURIComponent(email)}&from=${from}&to=${to}`,
        {
          cache: "no-store",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch availability planner");
      }

      const payload = (await response.json()) as {
        days?: Array<{ date?: string; available?: boolean; mode?: "all_day" | "range"; startTime?: string | null; endTime?: string | null }>;
      };

      const nextPlanner: Record<string, AvailabilityDayDraft> = Object.fromEntries(
        monthDays.map((dateKey) => [dateKey, toAvailabilityDraft({ available: false })])
      );

      for (const day of payload.days || []) {
        const dateKey = String(day?.date || "").trim();
        if (!dateKey || !nextPlanner[dateKey]) continue;
        nextPlanner[dateKey] = toAvailabilityDraft(day);
      }

      setAvailabilityPlanner(nextPlanner);
    } catch {
      setAvailabilityPlanner(Object.fromEntries(monthDays.map((dateKey) => [dateKey, toAvailabilityDraft({ available: false })])));
    } finally {
      setIsLoadingSchedule(false);
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

      await Promise.all([
        loadJobs(nextUser.email),
        loadInvoices(nextUser.email),
        loadAvailability(nextUser.email),
        loadAvailabilitySchedule(nextUser.email, selectedMonth),
      ]);
    });

    return () => unsubscribe();
  }, [loadAvailability, loadAvailabilitySchedule, loadInvoices, loadJobs, router, selectedMonth]);

  useEffect(() => {
    if (!user?.email) return;
    void loadAvailabilitySchedule(user.email, selectedMonth);
  }, [loadAvailabilitySchedule, selectedMonth, user?.email]);

  useEffect(() => {
    if (!user?.email) return;

    const stopPolling = createPollingInterval(() => {
      void Promise.all([loadJobs(user.email), loadInvoices(user.email), loadAvailability(user.email)]);
    }, 10000);

    const onVisibilityChange = () => {
      if (shouldRefreshOnVisibility(document.visibilityState)) {
        void Promise.all([loadJobs(user.email), loadInvoices(user.email), loadAvailability(user.email)]);
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [loadAvailability, loadInvoices, loadJobs, user?.email]);

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
      await Promise.all([loadJobs(user.email), loadInvoices(user.email), loadAvailability(user.email)]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAvailabilityToggle = async (checked: boolean) => {
    if (!user?.email || isUpdatingAvailability) return;

    const previousStatus = availabilityStatus;
    const nextStatus = checked ? "active" : "inactive";
    setAvailabilityStatus(nextStatus);
    setIsUpdatingAvailability(true);

    try {
      const token = await getAccessToken();
      const response = await fetch("/api/greeter/availability", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email: user.email, available: checked }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to update availability");
      }
      setAvailabilityStatus(payload?.status === "active" ? "active" : "inactive");
      toast.success(checked ? "Status set to Available" : "Status set to Unavailable");
    } catch (error: unknown) {
      setAvailabilityStatus(previousStatus);
      toast.error(error instanceof Error ? error.message : "Failed to update availability");
    } finally {
      setIsUpdatingAvailability(false);
    }
  };

  const handleScheduleFieldChange = (dateKey: string, patch: Partial<AvailabilityDayDraft>) => {
    setAvailabilityPlanner((current) => {
      const base = current[dateKey] || toAvailabilityDraft({ available: false });
      return {
        ...current,
        [dateKey]: {
          ...base,
          ...patch,
        },
      };
    });
  };

  const handleSaveScheduleDay = async (dateKey: string) => {
    if (!user?.email || savingScheduleDate) return;

    const draft = availabilityPlanner[dateKey] || toAvailabilityDraft({ available: false });
    if (draft.mode === "range" && (!draft.startTime || !draft.endTime || draft.startTime >= draft.endTime)) {
      toast.error("Enter a valid time range");
      return;
    }

    const previous = availabilityPlanner[dateKey] || toAvailabilityDraft({ available: false });
    setSavingScheduleDate(dateKey);

    try {
      const token = await getAccessToken();
      const response = await fetch("/api/greeter/availability/schedule", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          email: user.email,
          days: [
            {
              date: dateKey,
              available: draft.mode !== "unavailable",
              mode: draft.mode === "range" ? "range" : "all_day",
              startTime: draft.mode === "range" ? draft.startTime : null,
              endTime: draft.mode === "range" ? draft.endTime : null,
            },
          ],
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to save day availability");
      }

      toast.success(`Availability saved for ${formatPlannerDate(dateKey)}`);
    } catch (error: unknown) {
      setAvailabilityPlanner((current) => ({ ...current, [dateKey]: previous }));
      toast.error(error instanceof Error ? error.message : "Failed to save day availability");
    } finally {
      setSavingScheduleDate(null);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    router.push("/user/signin");
  };

  const greeterName = getGreeterName(user);
  const totalJobs = jobs.length;
  const completedJobs = jobs.filter((j) => (j.driver_status || j.status) === "completed").length;
  const activeJobs = jobs.filter((j) => {
    const status = j.driver_status || j.status || "";
    return ["accepted", "picked_up"].includes(status);
  }).length;
  const pendingJobs = jobs.filter((j) => (j.driver_status || j.status || "assigned") === "assigned").length;
  const todayStr = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const isAvailable = availabilityStatus === "active";
  const monthDays = useMemo(() => buildMonthDays(selectedMonth), [selectedMonth]);
  const maxWindowStart = Math.max(0, monthDays.length - 7);
  const visibleScheduleDays = monthDays.slice(scheduleWindowStart, scheduleWindowStart + 7);

  useEffect(() => {
    setScheduleWindowStart((current) => Math.min(current, maxWindowStart));
  }, [maxWindowStart]);

  const nextJob = useMemo(() => {
    const sorted = [...jobs].sort((a, b) => {
      const aDate = a.date_time ? new Date(a.date_time).getTime() : Number.MAX_SAFE_INTEGER;
      const bDate = b.date_time ? new Date(b.date_time).getTime() : Number.MAX_SAFE_INTEGER;
      return aDate - bDate;
    });
    return sorted.find((job) => (job.driver_status || job.status || "assigned") !== "completed") || sorted[0] || null;
  }, [jobs]);

  return (
    <section className="min-h-screen bg-slate-100 px-4 pb-16 pt-20 sm:px-6 sm:pt-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:mb-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 text-xs uppercase tracking-[0.34em] text-amber-600">Greeter Operations</div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              Hello, <span className="text-slate-700">{greeterName}</span>
            </h1>
            <p className="mt-2 text-sm text-slate-600 sm:text-base">
              {totalJobs === 0
                ? "No active assignments yet. New work appears here automatically."
                : `${totalJobs} assignments today · ${pendingJobs} waiting response · ${activeJobs} live now`}
            </p>
          </div>

          <Card className="w-full border-slate-200 bg-white p-4 shadow-sm sm:w-auto sm:min-w-[340px]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Availability</p>
                <p className={`mt-1 text-sm font-semibold ${isAvailable ? "text-emerald-700" : "text-rose-700"}`}>
                  {isAvailable ? "Available" : "Unavailable"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Office can only assign jobs when you are marked Available.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={isAvailable}
                  onCheckedChange={(checked: boolean) => {
                    void handleAvailabilityToggle(checked);
                  }}
                  disabled={isUpdatingAvailability}
                />
                {isUpdatingAvailability ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> : null}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleManualRefresh()}
                disabled={isRefreshing}
                className="border-slate-300 bg-white"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleLogout()}
                className="text-slate-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </div>
          </Card>
        </div>

        <Card className="mb-6 border-slate-200 bg-white p-4 shadow-sm sm:mb-8 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">Availability planner</h2>
              <p className="text-xs text-slate-500 sm:text-sm">
                Set your monthly availability. We display 7 days at a time for quick updates.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="availability-month" className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Month
              </label>
              <input
                id="availability-month"
                type="month"
                value={selectedMonth}
                onChange={(event) => {
                  setSelectedMonth(event.target.value);
                  setScheduleWindowStart(0);
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={scheduleWindowStart === 0}
              onClick={() => setScheduleWindowStart((current) => Math.max(0, current - 7))}
            >
              Previous 7 days
            </Button>
            <span className="text-xs text-slate-500">
              {visibleScheduleDays.length > 0
                ? `${formatPlannerDate(visibleScheduleDays[0])} - ${formatPlannerDate(visibleScheduleDays[visibleScheduleDays.length - 1])}`
                : "No dates"}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={scheduleWindowStart >= maxWindowStart}
              onClick={() => setScheduleWindowStart((current) => Math.min(maxWindowStart, current + 7))}
            >
              Next 7 days
            </Button>
          </div>

          <div className="mt-4 space-y-2">
            {visibleScheduleDays.map((dateKey) => {
              const draft = availabilityPlanner[dateKey] || toAvailabilityDraft({ available: false });
              const isSaving = savingScheduleDate === dateKey;

              return (
                <div key={dateKey} className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                  <div className="grid gap-3 sm:grid-cols-[170px_1fr_auto] sm:items-end">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{formatPlannerDate(dateKey)}</p>
                      <p className="text-xs text-slate-500">{dateKey}</p>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-[180px_1fr_1fr]">
                      <select
                        value={draft.mode}
                        onChange={(event) =>
                          handleScheduleFieldChange(dateKey, { mode: event.target.value as AvailabilityMode })
                        }
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      >
                        <option value="unavailable">Unavailable</option>
                        <option value="all_day">Available all day</option>
                        <option value="range">Available between times</option>
                      </select>

                      <input
                        type="time"
                        value={draft.startTime}
                        disabled={draft.mode !== "range"}
                        onChange={(event) => handleScheduleFieldChange(dateKey, { startTime: event.target.value })}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-50"
                      />

                      <input
                        type="time"
                        value={draft.endTime}
                        disabled={draft.mode !== "range"}
                        onChange={(event) => handleScheduleFieldChange(dateKey, { endTime: event.target.value })}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-50"
                      />
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void handleSaveScheduleDay(dateKey)}
                      disabled={isLoadingSchedule || isSaving}
                      className="bg-slate-900 text-white hover:bg-slate-800"
                    >
                      {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save day"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="mb-6 grid gap-3 sm:mb-8 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Duty status"
            value={isAvailable ? "Available" : "Unavailable"}
            tone={isAvailable ? "text-emerald-700" : "text-rose-700"}
          />
          <StatCard icon={<CalendarDays className="h-5 w-5" />} label="Jobs today" value={String(totalJobs)} />
          <StatCard icon={<Clock className="h-5 w-5" />} label="Awaiting response" value={String(pendingJobs)} />
          <StatCard icon={<Users className="h-5 w-5" />} label="Completed" value={String(completedJobs)} />
        </div>

        {isLoading ? (
          <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
            <div className="h-[24rem] animate-pulse rounded-3xl bg-white shadow-sm sm:h-[28rem]" />
            <div className="h-[22rem] animate-pulse rounded-3xl bg-white shadow-sm sm:h-[28rem]" />
          </div>
        ) : totalJobs === 0 ? (
          <Card className="rounded-3xl border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm sm:py-20">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-slate-100 text-slate-500">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">No assignments on your board</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              When the office assigns a meet and greet, this dashboard will show live timings, flight details, and invoicing actions.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1.35fr_1fr]">
            <Card className="overflow-hidden rounded-3xl border-slate-200 bg-white p-0 shadow-sm">
              <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 sm:text-2xl">Today's roster</h3>
                  <p className="mt-1 text-xs text-slate-500 sm:text-sm">Assigned meet-and-greet movements for {todayStr}</p>
                </div>
                <div className="w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-amber-700 sm:text-[11px]">
                  {totalJobs} jobs
                </div>
              </div>

              <div className="divide-y divide-slate-200">
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
                  const isFeatured = nextJob?.id === job.id;

                  return (
                    <div key={job.id} className={`p-4 sm:p-6 ${isFeatured ? getCardHighlight(currentStatus) : "bg-white"}`}>
                      <div className="flex flex-col gap-4 sm:gap-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex min-w-0 gap-4 sm:gap-5">
                            <div className="min-w-[64px] text-center sm:min-w-[72px]">
                              <div className={`text-xl font-semibold sm:text-2xl ${getStatusTone(currentStatus)}`}>{formatJobTime(job.date_time)}</div>
                              <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-slate-500">
                                {job.booking_ref || job.id.slice(0, 8)}
                              </div>
                            </div>

                            <div className="min-w-0 space-y-1.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="font-medium text-slate-900">{job.full_name || "Guest passenger"}</div>
                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${getStatusColor(currentStatus)}`}>
                                  {getGreeterStatusLabel(currentStatus)}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                                <MapPin className="h-3.5 w-3.5" />
                                <span className="break-words">{job.pickup_location || "Pickup pending"}</span>
                                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                                <span className="break-words">{job.dropoff_location || "Drop-off pending"}</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-sm">
                                <span className="text-slate-500">{formatJobDate(job.date_time)}</span>
                                <span className="flex items-center gap-1 text-slate-500"><Users className="h-3.5 w-3.5" /> {job.passengers ?? 1}</span>
                                <span className="font-medium text-slate-700">{formatCurrency(job.amount)}</span>
                              </div>
                              {flight && (
                                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                                  <Plane className="h-3.5 w-3.5" />
                                  <span>{flight}</span>
                                  {flightInfo ? (
                                    <span className={`rounded-full px-2 py-0.5 text-xs ${flightInfo.source === "remote" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                                      {flightInfo.status}{flightInfo.terminal ? ` · T${flightInfo.terminal}` : ""}
                                    </span>
                                  ) : null}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex w-full flex-wrap gap-2 lg:w-auto">
                            {nextAction ? (
                              <Button
                                onClick={() => void handleJobAction(job.id, nextAction.action)}
                                disabled={activeJobId === job.id}
                                className="w-full bg-slate-900 text-white hover:bg-slate-800 sm:w-auto"
                              >
                                {activeJobId === job.id ? (
                                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</>
                                ) : (
                                  <><Navigation className="mr-2 h-4 w-4" /> {nextAction.label}</>
                                )}
                              </Button>
                            ) : (
                              <div className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                                <CheckCircle2 className="mr-2 h-4 w-4" /> Completed
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3 sm:hidden">
                          <div className="mb-2 flex items-center justify-between text-xs text-slate-600">
                            <span>{getStepLabel(STATUS_STEPS[Math.max(0, Math.min(stepIdx, STATUS_STEPS.length - 1))])}</span>
                            <span>Step {Math.min(stepIdx + 1, STATUS_STEPS.length)} of {STATUS_STEPS.length}</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-200">
                            <div
                              className="h-2 rounded-full bg-emerald-500 transition-all"
                              style={{ width: `${(Math.min(stepIdx + 1, STATUS_STEPS.length) / STATUS_STEPS.length) * 100}%` }}
                            />
                          </div>
                        </div>

                        <div className="hidden sm:block">
                          <div className="flex items-center">
                            {STATUS_STEPS.map((step, i) => {
                              const done = i < stepIdx;
                              const current = i === stepIdx;
                              return (
                                <div key={step} className="flex flex-1 items-center last:flex-none">
                                  <div className="flex flex-col items-center">
                                    <div className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold ${done ? "border-emerald-500 bg-emerald-500 text-white" : current ? "border-amber-500 bg-amber-50 text-amber-700" : "border-slate-200 bg-white text-slate-300"}`}>
                                      {done ? "✓" : i + 1}
                                    </div>
                                    <span className={`mt-1 text-[10px] uppercase tracking-[0.18em] ${done ? "text-emerald-600" : current ? "text-amber-600" : "text-slate-400"}`}>
                                      {getStepLabel(step)}
                                    </span>
                                  </div>
                                  {i < STATUS_STEPS.length - 1 && (
                                    <div className={`mb-4 h-0.5 flex-1 ${i < stepIdx ? "bg-emerald-400" : "bg-slate-200"}`} />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {invoice ? (
                        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                          <div className="flex items-start gap-3">
                            <FileText className="mt-0.5 h-4 w-4 text-emerald-600" />
                            <div>
                              <p className="text-sm font-semibold text-emerald-800">
                                Invoice {getInvoiceStatusLabel(invoice.office_status)} · {formatCurrency(invoice.amount)}
                              </p>
                              {invoice.notes ? <p className="mt-1 text-xs text-emerald-700">{invoice.notes}</p> : null}
                            </div>
                          </div>
                        </div>
                      ) : canSubmit ? (
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50">
                          <button
                            onClick={() => setExpandedInvoice((prev) => ({ ...prev, [job.id]: !prev[job.id] }))}
                            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-slate-500" />
                              Submit invoice to office
                            </div>
                            {isInvoiceExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                          </button>

                          {isInvoiceExpanded && (
                            <div className="space-y-3 border-t border-slate-200 px-4 pb-4 pt-3">
                              <div>
                                <label className="mb-1 block text-xs font-medium text-slate-600">Amount (GBP)</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
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
                                <label className="mb-1 block text-xs font-medium text-slate-600">Notes <span className="font-normal text-slate-400">(optional)</span></label>
                                <textarea
                                  rows={3}
                                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                                  value={draft.notes}
                                  onChange={(e) =>
                                    setInvoiceDrafts((cur) => ({
                                      ...cur,
                                      [job.id]: { amount: draft.amount, notes: e.target.value },
                                    }))
                                  }
                                  placeholder="Any notes for the office"
                                />
                              </div>
                              <Button
                                onClick={() => void handleSubmitInvoice(job)}
                                disabled={submittingInvoiceId === job.id}
                                className="w-full bg-slate-900 text-white hover:bg-slate-800"
                              >
                                {submittingInvoiceId === job.id ? (
                                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
                                ) : (
                                  "Submit invoice"
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="rounded-3xl border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h3 className="text-xl font-semibold text-slate-900 sm:text-2xl">Next pickup</h3>
              <div className="relative mb-5 mt-5 grid aspect-video place-items-center overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-amber-50 via-white to-slate-100 sm:mb-6 sm:mt-6">
                <div
                  className="absolute inset-0 opacity-60"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 30% 35%, rgba(251,191,36,0.22), transparent 42%), radial-gradient(circle at 72% 70%, rgba(148,163,184,0.18), transparent 40%)",
                  }}
                />
                <Navigation className="relative h-10 w-10 text-slate-700 sm:h-11 sm:w-11" />
              </div>

              {nextJob ? (
                <>
                  <div className="mb-5 rounded-2xl bg-slate-50 p-4 sm:mb-6">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Upcoming movement</div>
                    <div className="mt-1 text-lg font-semibold text-slate-900 sm:text-xl">{nextJob.full_name || "Guest passenger"}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                      <span>{formatJobDate(nextJob.date_time)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(nextJob.driver_status || nextJob.status || "assigned")}`}>
                        {getGreeterStatusLabel(nextJob.driver_status || nextJob.status || "assigned")}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 text-sm">
                    <DetailRow k="Pickup" v={String(nextJob.pickup_location || "Location pending")} />
                    <DetailRow k="Drop-off" v={String(nextJob.dropoff_location || "Not set")} />
                    <DetailRow k="Passengers" v={`${nextJob.passengers ?? 1}`} />
                    <DetailRow k="Booking ref" v={String(nextJob.booking_ref || nextJob.id.slice(0, 8))} />
                    <DetailRow
                      k="Flight"
                      v={(() => {
                        const flight = getPrimaryFlightNumber(nextJob);
                        const info = flight ? flightStatuses[flight] : null;
                        if (!flight) return "No flight linked";
                        return `${flight}${info?.terminal ? ` · T${info.terminal}` : ""}${info?.status ? ` · ${info.status}` : ""}`;
                      })()}
                    />
                  </div>

                  <Button
                    className="mt-6 w-full bg-slate-900 text-white hover:bg-slate-800"
                    onClick={() => {
                      const action = getGreeterActionConfig(nextJob.driver_status || nextJob.status || "assigned");
                      if (action) {
                        void handleJobAction(nextJob.id, action.action);
                      }
                    }}
                    disabled={activeJobId === nextJob.id || !getGreeterActionConfig(nextJob.driver_status || nextJob.status || "assigned")}
                  >
                    {activeJobId === nextJob.id ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</>
                    ) : (
                      <><Navigation className="mr-2 h-4 w-4" /> {getGreeterActionConfig(nextJob.driver_status || nextJob.status || "assigned")?.label ?? "No next action"}</>
                    )}
                  </Button>
                </>
              ) : (
                <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
                  No pickup queued right now.
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </section>
  );
}
