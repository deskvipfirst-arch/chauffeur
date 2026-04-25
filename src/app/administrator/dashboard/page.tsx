"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Car,
  ChevronLeft,
  Clock3,
  DollarSign,
  FileText,
  Key,
  LayoutGrid,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  Settings,
  Shield,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import BookingRow from "@/components/admin/BookingRow";
import DriverPaymentsTab from "@/components/admin/DriverPaymentsTab";
import InvoicesTab from "@/components/admin/InvoicesTab";
import MobileBookingCard from "@/components/admin/MobileBookingCard";
import PriceSettingsTab from "@/components/admin/PriceSettingsTab";
import VehiclesTab from "@/components/admin/VehiclesTab";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  fetchBookings,
  fetchDriverPayments,
  fetchDrivers,
  fetchExtraCharges,
  fetchGreeterInvoices,
  fetchLocations,
  fetchOfficeStaff,
  fetchServicePricing,
  fetchVehicles,
} from "@/lib/adminFetch";
import { getUserRole, isAllowedRole } from "@/lib/adminUtils";
import { getPrimaryFlightNumber } from "@/lib/flightStatus";
import { filterHeathrowBookings, getMonitoringPriority } from "@/lib/heathrowMonitoring";
import { createPollingInterval, shouldRefreshOnVisibility } from "@/lib/liveJobs";
import {
  buildAssignmentNotification,
  buildGreeterStatusNotification,
  buildOperationsAlerts,
  buildUnauthorizedNotification,
} from "@/lib/notifications";
import { auth, getAccessToken } from "@/lib/supabase";
import { onAuthStateChanged } from "@/lib/supabase-auth";
import { cn } from "@/lib/utils";
import type { Booking, Driver, DriverPayment, GreeterInvoice, OfficeStaff, Vehicle } from "@/types/admin";

type ActiveTab =
  | "overview"
  | "people"
  | "passengers"
  | "bookings"
  | "vehicles"
  | "payments"
  | "invoices"
  | "priceSettings"
  | "heathrow";

type DensityMode = "comfortable" | "compact";

type EmailStatus = {
  configured: boolean;
  fromEmail: string | null;
  officeDestination: string | null;
  officeDestinationValue?: string;
  missing: string[];
};

const ACTIVE_TAB_LABELS: Record<ActiveTab, string> = {
  overview: "Overview",
  people: "People",
  passengers: "Passengers",
  bookings: "Dispatch",
  vehicles: "Fleet",
  payments: "Payments",
  invoices: "Invoices",
  priceSettings: "Pricing",
  heathrow: "Heathrow Monitor",
};

const ACTIVE_TAB_DESCRIPTIONS: Record<ActiveTab, string> = {
  overview: "Operational health, urgent signals, and shortcuts",
  people: "Greeters, availability, and office staffing",
  passengers: "Passenger timelines across past, present, and future",
  bookings: "Dispatch board and job lifecycle management",
  vehicles: "Fleet inventory and maintenance controls",
  payments: "Driver payment operations and settlement status",
  invoices: "Greeter invoice review and office approvals",
  priceSettings: "Rates, locations, and extra charge controls",
  heathrow: "Airport monitoring, flight status, and live readiness",
};

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [canAccessDashboard, setCanAccessDashboard] = useState(false);
  const [isMonitoringOnly, setIsMonitoringOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [densityMode, setDensityMode] = useState<DensityMode>("comfortable");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  const [emailStatus, setEmailStatus] = useState<EmailStatus | null>(null);
  const [isEmailStatusLoading, setIsEmailStatusLoading] = useState(true);
  const [isSendingEmailTest, setIsSendingEmailTest] = useState(false);
  const [officeInboxInput, setOfficeInboxInput] = useState("");
  const [isSavingOfficeInbox, setIsSavingOfficeInbox] = useState(false);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);
  const [vehicleError, setVehicleError] = useState<string | null>(null);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [officeStaff, setOfficeStaff] = useState<OfficeStaff[]>([]);
  const [staffError, setStaffError] = useState<string | null>(null);

  const [driverPayments, setDriverPayments] = useState<DriverPayment[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const [greeterInvoices, setGreeterInvoices] = useState<GreeterInvoice[]>([]);
  const [flightStatuses, setFlightStatuses] = useState<Record<string, { status: string; terminal: string | null; source: string }>>({});

  const [peopleQuery, setPeopleQuery] = useState("");
  const [staffRoleFilter, setStaffRoleFilter] = useState<"all" | "admin" | "heathrow">("all");
  const [passengerQuery, setPassengerQuery] = useState("");

  const lastHandledAuthUidRef = useRef<string | null>(null);
  const router = useRouter();

  const isHeathrowOnly = isMonitoringOnly;
  const canManageOperations = !isHeathrowOnly;

  const shellPadding = densityMode === "compact" ? "p-3 sm:p-4" : "p-4 sm:p-6";
  const sectionGap = densityMode === "compact" ? "space-y-4" : "space-y-6";
  const cardClass = "rounded-2xl border border-slate-200/80 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.06)]";
  const metricCardClass = cn(cardClass, densityMode === "compact" ? "p-4" : "p-5");
  const panelClass = cn(cardClass, "overflow-hidden");

  const fetchEmailStatus = async () => {
    try {
      const token = await getAccessToken();
      const response = await fetch("/api/admin/email", {
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const result = await response.json().catch(() => null);

      if (response.ok && result?.email) {
        setEmailStatus(result.email);
        setOfficeInboxInput(String(result.email.officeDestinationValue || ""));
      } else {
        setEmailStatus(null);
      }
    } catch {
      setEmailStatus(null);
    } finally {
      setIsEmailStatusLoading(false);
    }
  };

  const loadOperationsData = async () => {
    await Promise.all([
      fetchVehicles().then(({ data, error, isLoading: loading }) => {
        setVehicles(data || []);
        setVehicleError(error);
        setIsLoadingVehicles(loading);
      }),
      fetchBookings().then(({ data, error, isLoading: loading }) => {
        setBookings(data || []);
        setBookingError(error);
        setIsLoadingBookings(loading);
      }),
      fetchDrivers().then(({ data }) => {
        setDrivers(data || []);
      }),
      fetchOfficeStaff().then(({ data, error }) => {
        setOfficeStaff(data || []);
        setStaffError(error);
      }),
      fetchDriverPayments().then(({ data, error, isLoading: loading }) => {
        setDriverPayments(data || []);
        setPaymentError(error);
        setIsLoadingPayments(loading);
      }),
      fetchGreeterInvoices().then(({ data }) => {
        setGreeterInvoices(data || []);
      }),
      fetchEmailStatus(),
    ]);
  };

  const refreshDashboardData = async (monitoringOnly: boolean) => {
    if (monitoringOnly) {
      const { data, error, isLoading: loading } = await fetchBookings();
      setBookings(data || []);
      setBookingError(error);
      setIsLoadingBookings(loading);
      return;
    }

    await loadOperationsData();
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        lastHandledAuthUidRef.current = null;
        window.location.replace("/administrator/signin");
        return;
      }

      if (lastHandledAuthUidRef.current === user.uid) {
        return;
      }

      lastHandledAuthUidRef.current = user.uid;

      try {
        const role = await getUserRole(user.uid);
        const monitoringOnly = isAllowedRole(role, ["heathrow"]);
        const hasDashboardAccess = isAllowedRole(role, ["admin", "heathrow"]);

        if (!hasDashboardAccess) {
          const notice = buildUnauthorizedNotification("admin");
          toast.error(notice.message);
          await auth.signOut();
          window.location.replace("/administrator/signin");
          return;
        }

        setIsAuthenticated(true);
        setCanAccessDashboard(true);
        setIsMonitoringOnly(monitoringOnly);
        setUserEmail(user.email || "");
        setActiveTab(monitoringOnly ? "heathrow" : "overview");
        setIsLoading(false);

        await refreshDashboardData(monitoringOnly);
      } catch (error) {
        console.error("Error checking admin status:", error);
        await auth.signOut();
        window.location.replace("/administrator/signin");
      }
    });

    return () => unsubscribe();
  }, []);

  const updateBookingInState = (bookingId: string, updates: Partial<Booking>) => {
    setBookings((current) => current.map((booking) => (booking.id === bookingId ? { ...booking, ...updates } : booking)));
  };

  const handleUpdateBookingStatus = async (bookingId: string, newStatus: string) => {
    const token = await getAccessToken();
    const response = await fetch(`/api/admin/bookings/${bookingId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ status: newStatus }),
    });

    const result = await response.json();
    if (!response.ok) {
      toast.error(result.error || "Failed to update booking status");
      return;
    }

    updateBookingInState(bookingId, result);
    toast.success("Booking status updated");
  };

  const handleAssignDriver = async (bookingId: string, value: string) => {
    const isUnassign = value === "unassign";
    const token = await getAccessToken();
    const requestBody = isUnassign
      ? { driver_id: null, driver_status: "unassigned", assigned_at: null }
      : { driver_id: value, driver_status: "assigned", status: "assigned", assigned_at: new Date().toISOString() };

    let response = await fetch(`/api/admin/bookings/${bookingId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(requestBody),
    });

    let result = await response.json();

    if (!response.ok && result?.code === "ASSIGNMENT_OVERRIDE_REQUIRED" && !isUnassign) {
      const reason = window.prompt("This booking is within 24 hours. Enter override reason to continue assignment:");
      if (!reason || !reason.trim()) {
        toast.error("Assignment cancelled. Override reason is required for late assignment.");
        return;
      }

      response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ...requestBody, assignment_override_reason: reason.trim() }),
      });
      result = await response.json();
    }

    if (!response.ok) {
      toast.error(result.error || "Failed to assign greeter");
      return;
    }

    updateBookingInState(bookingId, result);
    if (isUnassign) {
      toast.success("Greeter unassigned");
    } else {
      toast.success(buildAssignmentNotification(result.booking_ref || bookingId).message);
    }
  };

  const handleMarkBookingCompleted = async (bookingId: string) => {
    const token = await getAccessToken();
    const response = await fetch(`/api/admin/bookings/${bookingId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        status: "completed",
        driver_status: "completed",
        completed_at: new Date().toISOString(),
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      toast.error(result.error || "Failed to complete booking");
      return;
    }

    updateBookingInState(bookingId, result);
    toast.success(buildGreeterStatusNotification("completed", result.booking_ref || bookingId).message);
  };

  const handleDeleteBooking = async (bookingId: string) => {
    const response = await fetch(`/api/admin/bookings/${bookingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "deleted" }),
    });

    const result = await response.json();
    if (!response.ok) {
      toast.error(result.error || "Failed to delete booking");
      return;
    }

    setBookings((current) => current.filter((booking) => booking.id !== bookingId));
    toast.success("Booking removed from the active list");
  };

  const handleSendTestEmail = async () => {
    try {
      setIsSendingEmailTest(true);
      const token = await getAccessToken();
      const response = await fetch("/api/admin/email", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error(result?.error || "Failed to send test email");
        return;
      }

      toast.success(result?.message || "Test email sent successfully");
      await fetchEmailStatus();
    } catch {
      toast.error("Failed to send test email");
    } finally {
      setIsSendingEmailTest(false);
    }
  };

  const handleSaveOfficeInbox = async () => {
    try {
      setIsSavingOfficeInbox(true);
      const token = await getAccessToken();
      const response = await fetch("/api/admin/email", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ officeInbox: officeInboxInput }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(result?.error || "Failed to update office inbox");
        return;
      }

      if (result?.email) {
        setEmailStatus(result.email);
        setOfficeInboxInput(String(result.email.officeDestinationValue || officeInboxInput));
      }

      toast.success(result?.message || "Office inbox updated");
    } catch {
      toast.error("Failed to update office inbox");
    } finally {
      setIsSavingOfficeInbox(false);
    }
  };

  const loadFlightStatuses = async (items: Booking[]) => {
    const relevant = filterHeathrowBookings(items);
    const flights = Array.from(new Set(relevant.map((booking) => getPrimaryFlightNumber(booking)).filter(Boolean)));

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

  useEffect(() => {
    void loadFlightStatuses(bookings);
  }, [bookings]);

  useEffect(() => {
    if (!isAuthenticated || !canAccessDashboard) {
      return;
    }

    const stopPolling = createPollingInterval(() => refreshDashboardData(isHeathrowOnly), 15000);
    const onVisibilityChange = () => {
      if (shouldRefreshOnVisibility(document.visibilityState)) {
        void refreshDashboardData(isHeathrowOnly);
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isAuthenticated, canAccessDashboard, isHeathrowOnly]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      toast.success("Successfully signed out");
      window.location.replace("/administrator/signin");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
    }
  };

  const handleManualRefresh = async () => {
    await refreshDashboardData(isHeathrowOnly);
    toast.success("Dashboard refreshed");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-slate-900" />
          <p className="mt-4 text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !canAccessDashboard) {
    return null;
  }

  const totalBookings = bookings.length;
  const normalizeServiceType = (value?: string) => String(value || "").toLowerCase();
  const meetAndGreetBookings = bookings.filter((booking) => {
    const type = normalizeServiceType(booking.service_type);
    return type.includes("meet") || type.includes("assist");
  }).length;
  const airportTransferBookings = bookings.filter((booking) => {
    const type = normalizeServiceType(booking.service_type);
    return type.includes("airport") || type.includes("transfer");
  }).length;
  const hourlyHireBookings = bookings.filter((booking) => normalizeServiceType(booking.service_type).includes("hour")).length;
  const totalRevenue = bookings.reduce((sum, booking) => sum + (booking.amount || 0), 0);
  const activeDrivers = drivers.filter((driver) => driver.status === "active").length;
  const activeJobs = bookings.filter((booking) => ["assigned", "accepted", "picked_up"].includes(String(booking.driver_status || booking.status))).length;
  const completedJobs = bookings.filter((booking) => String(booking.driver_status || booking.status) === "completed").length;
  const heathrowBookings = filterHeathrowBookings(bookings);
  const officeAlerts = buildOperationsAlerts({ bookings, invoices: greeterInvoices });
  const now = new Date();
  const futureBookings = bookings.filter((booking) => new Date(booking.date_time) > now);
  const presentBookings = bookings.filter((booking) => {
    const scheduleTime = new Date(booking.date_time).getTime();
    const diffHours = Math.abs(now.getTime() - scheduleTime) / (1000 * 60 * 60);
    return diffHours <= 6 || ["assigned", "accepted", "picked_up"].includes(String(booking.driver_status || booking.status));
  });
  const pastBookings = bookings.filter((booking) => new Date(booking.date_time) < now);

  const greeterAvailability = drivers.map((driver) => {
    const assignedJobs = bookings.filter((booking) => {
      if (String(booking.driver_id || "") !== String(driver.id)) {
        return false;
      }
      return ["assigned", "accepted", "picked_up"].includes(String(booking.driver_status || booking.status || ""));
    });

    const nextJob = bookings
      .filter((booking) => String(booking.driver_id || "") === String(driver.id) && new Date(booking.date_time) >= now)
      .sort((left, right) => new Date(left.date_time).getTime() - new Date(right.date_time).getTime())[0];

    return {
      ...driver,
      assignedJobs,
      nextJob,
      availability: driver.status === "active" && assignedJobs.length === 0 ? "available" : "unavailable",
    };
  });

  const normalizedPeopleQuery = peopleQuery.trim().toLowerCase();
  const filteredGreeterAvailability = greeterAvailability.filter((greeter) => {
    if (!normalizedPeopleQuery) {
      return true;
    }
    return `${greeter.full_name} ${greeter.email} ${greeter.phone}`.toLowerCase().includes(normalizedPeopleQuery);
  });

  const filteredOfficeStaff = officeStaff.filter((staff) => {
    const role = String(staff.role || "user").toLowerCase();
    const roleMatches = staffRoleFilter === "all" ? true : role === staffRoleFilter;
    if (!roleMatches) {
      return false;
    }

    if (!normalizedPeopleQuery) {
      return true;
    }

    const fullName = [staff.first_name, staff.last_name].filter(Boolean).join(" ").toLowerCase();
    return `${fullName} ${staff.email} ${role}`.includes(normalizedPeopleQuery);
  });

  const normalizedPassengerQuery = passengerQuery.trim().toLowerCase();
  const filterPassengerBookings = (items: Booking[]) =>
    items.filter((booking) => {
      if (!normalizedPassengerQuery) {
        return true;
      }
      return `${booking.full_name || ""} ${booking.email || ""} ${booking.phone || ""} ${booking.booking_ref || ""} ${booking.pickup_location || ""} ${booking.dropoff_location || ""}`
        .toLowerCase()
        .includes(normalizedPassengerQuery);
    });

  const filteredFutureBookings = filterPassengerBookings(futureBookings);
  const filteredPresentBookings = filterPassengerBookings(presentBookings);
  const filteredPastBookings = filterPassengerBookings(pastBookings);

  const activeTabLabel = ACTIVE_TAB_LABELS[activeTab];
  const activeTabDescription = ACTIVE_TAB_DESCRIPTIONS[activeTab];

  const navItems = [
    !isHeathrowOnly ? { id: "overview" as ActiveTab, label: "Overview", icon: LayoutGrid } : null,
    !isHeathrowOnly ? { id: "people" as ActiveTab, label: "People", icon: Users } : null,
    !isHeathrowOnly ? { id: "passengers" as ActiveTab, label: "Passengers", icon: Clock3 } : null,
    canManageOperations ? { id: "bookings" as ActiveTab, label: "Dispatch", icon: Calendar } : null,
    canManageOperations ? { id: "vehicles" as ActiveTab, label: "Vehicles", icon: Car } : null,
    canManageOperations ? { id: "payments" as ActiveTab, label: "Payments", icon: DollarSign } : null,
    canManageOperations ? { id: "invoices" as ActiveTab, label: "Invoices", icon: FileText } : null,
    canManageOperations ? { id: "priceSettings" as ActiveTab, label: "Pricing", icon: Settings } : null,
    { id: "heathrow" as ActiveTab, label: "Heathrow Monitor", icon: Shield },
  ].filter(Boolean) as Array<{ id: ActiveTab; label: string; icon: typeof LayoutGrid }>;

  const quickActions =
    activeTab === "overview"
      ? [
          { label: "Open Dispatch", onClick: () => setActiveTab("bookings") },
          { label: "Open People", onClick: () => setActiveTab("people") },
          { label: "Open Invoices", onClick: () => setActiveTab("invoices") },
        ]
      : activeTab === "people"
        ? [{ label: "Add Admin", onClick: () => router.push("/administrator/add-admin") }]
        : activeTab === "passengers"
          ? [{ label: "Open Dispatch", onClick: () => setActiveTab("bookings") }]
          : activeTab === "bookings"
            ? [{ label: "Open Heathrow", onClick: () => setActiveTab("heathrow") }]
            : [];

  const renderNav = (mobile = false) => (
    <nav className={cn("space-y-1", mobile ? "mt-3" : "p-3")}>
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setActiveTab(item.id);
              if (mobile) {
                setMobileSidebarOpen(false);
              }
            }}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
              activeTab === item.id
                ? "bg-blue-600 text-white shadow-[0_10px_20px_rgba(37,99,235,0.35)]"
                : "text-slate-200 hover:bg-slate-700/80",
              !mobile && !isSidebarOpen && "justify-center"
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {(mobile || isSidebarOpen) && <span>{item.label}</span>}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#e2e8f0,_#f8fafc_42%,_#eef2ff_100%)]">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-slate-800 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-slate-100 md:flex md:flex-col",
          isSidebarOpen ? "w-72" : "w-24"
        )}
      >
        <div className="border-b border-slate-700/80 p-4">
          <div className="flex items-center justify-between gap-3">
            {isSidebarOpen && (
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">VIP Greeters</p>
                <h1 className="mt-1 text-sm font-semibold text-white">Operations Console</h1>
              </div>
            )}
            <button
              type="button"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className="rounded-lg p-2 text-slate-200 hover:bg-slate-700"
              aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              <ChevronLeft className={cn("h-5 w-5 transition-transform", !isSidebarOpen && "rotate-180")} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">{renderNav(false)}</div>
        {isSidebarOpen && (
          <div className="border-t border-slate-700/80 p-4 text-xs text-slate-400">
            <p className="font-medium text-slate-200">Signed in</p>
            <p className="mt-1 break-all">{userEmail}</p>
          </div>
        )}
      </aside>

      {mobileSidebarOpen && <div className="fixed inset-0 z-40 bg-slate-950/50 md:hidden" onClick={() => setMobileSidebarOpen(false)} />}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-80 border-r border-slate-800 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 p-3 text-slate-100 transition-transform md:hidden",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">VIP Greeters</p>
            <h2 className="mt-1 text-sm font-semibold text-white">Operations Console</h2>
          </div>
          <button type="button" onClick={() => setMobileSidebarOpen(false)} className="rounded-lg p-2 hover:bg-slate-700" aria-label="Close sidebar">
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>
        {renderNav(true)}
      </aside>

      <div className={cn("min-h-screen transition-all duration-300", isSidebarOpen ? "md:pl-72" : "md:pl-24")}>
        <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <button type="button" className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 md:hidden" onClick={() => setMobileSidebarOpen(true)} aria-label="Open sidebar">
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <p className="text-sm font-semibold text-slate-900">{activeTabLabel}</p>
                <p className="text-xs text-slate-500">{activeTabDescription}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <Button type="button" variant="outline" size="sm" onClick={handleManualRefresh} className="hidden sm:inline-flex">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <div className="hidden rounded-xl border border-slate-200 bg-slate-50 p-1 sm:flex">
                <button
                  type="button"
                  onClick={() => setDensityMode("comfortable")}
                  className={cn("rounded-lg px-3 py-1.5 text-xs font-medium transition-colors", densityMode === "comfortable" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}
                >
                  Comfortable
                </button>
                <button
                  type="button"
                  onClick={() => setDensityMode("compact")}
                  className={cn("rounded-lg px-3 py-1.5 text-xs font-medium transition-colors", densityMode === "compact" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}
                >
                  Compact
                </button>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9 ring-2 ring-slate-200">
                    <AvatarFallback>{userEmail.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{isHeathrowOnly ? "Heathrow Operations" : "Admin"}</p>
                      <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/administrator/profile")}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  {canManageOperations && (
                    <>
                      <DropdownMenuItem onClick={() => router.push("/administrator/add-admin")}>
                        <Shield className="mr-2 h-4 w-4" />
                        <span>Add Admin</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push("/administrator/change-password")}>
                        <Key className="mr-2 h-4 w-4" />
                        <span>Change Password</span>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] p-4 sm:p-6">
          <div className={sectionGap}>
            <section className={cn(cardClass, shellPadding, "bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 text-white")}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-blue-200/80">Control Center</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{activeTabLabel}</h2>
                  <p className="mt-2 max-w-2xl text-sm text-slate-300">{activeTabDescription}. Built for fast operational scanning, staffing visibility, and passenger coordination.</p>
                </div>
                {quickActions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {quickActions.map((action) => (
                      <Button key={action.label} type="button" variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={action.onClick}>
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {activeTab === "overview" && !isHeathrowOnly && (
              <div className={sectionGap}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className={metricCardClass}>
                    <p className="text-sm text-slate-500">Total Bookings</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">{totalBookings}</p>
                  </div>
                  <div className={metricCardClass}>
                    <p className="text-sm text-slate-500">Live Jobs</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">{activeJobs}</p>
                  </div>
                  <div className={metricCardClass}>
                    <p className="text-sm text-slate-500">Greeters Available</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">{greeterAvailability.filter((greeter) => greeter.availability === "available").length}</p>
                  </div>
                  <div className={metricCardClass}>
                    <p className="text-sm text-slate-500">Office Staff</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">{officeStaff.length}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_0.9fr]">
                  <section className={panelClass}>
                    <div className="border-b border-slate-200/80 p-4 sm:p-5">
                      <h3 className="text-lg font-semibold text-slate-900">Office Alerts</h3>
                      <p className="text-sm text-slate-500">Urgent operational and finance signals that need action.</p>
                    </div>
                    <div className={cn(shellPadding, "space-y-3")}>
                      {officeAlerts.length === 0 ? (
                        <p className="text-sm text-slate-500">No immediate office alerts.</p>
                      ) : (
                        officeAlerts.map((alert, index) => (
                          <div
                            key={`${alert.title}-${index}`}
                            className={cn(
                              "rounded-xl border px-4 py-3",
                              alert.level === "warning" && "border-amber-200 bg-amber-50 text-amber-900",
                              alert.level === "success" && "border-emerald-200 bg-emerald-50 text-emerald-900",
                              alert.level === "info" && "border-blue-200 bg-blue-50 text-blue-900"
                            )}
                          >
                            <p className="font-semibold">{alert.title}</p>
                            <p className="text-sm">{alert.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </section>

                  <section className={panelClass}>
                    <div className="border-b border-slate-200/80 p-4 sm:p-5">
                      <h3 className="text-lg font-semibold text-slate-900">Demand Mix</h3>
                      <p className="text-sm text-slate-500">How bookings are distributed across core service types.</p>
                    </div>
                    <div className={cn(shellPadding, "grid gap-3")}>
                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-sm text-slate-500">Meet & Greet</p>
                        <p className="mt-1 text-2xl font-semibold text-slate-900">{meetAndGreetBookings}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-sm text-slate-500">Airport Transfers</p>
                        <p className="mt-1 text-2xl font-semibold text-slate-900">{airportTransferBookings}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-sm text-slate-500">Hourly Hire</p>
                        <p className="mt-1 text-2xl font-semibold text-slate-900">{hourlyHireBookings}</p>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            )}

            {activeTab === "people" && !isHeathrowOnly && (
              <div className={sectionGap}>
                <section className={cn(cardClass, shellPadding)}>
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input value={peopleQuery} onChange={(event) => setPeopleQuery(event.target.value)} className="pl-9" placeholder="Search greeters or office staff by name, email, phone, or role" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(["all", "admin", "heathrow"] as const).map((roleOption) => (
                        <Button key={roleOption} type="button" size="sm" variant={staffRoleFilter === roleOption ? "default" : "outline"} onClick={() => setStaffRoleFilter(roleOption)} className="capitalize">
                          {roleOption}
                        </Button>
                      ))}
                    </div>
                  </div>
                </section>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <section className={panelClass}>
                    <div className="border-b border-slate-200/80 p-4 sm:p-5">
                      <h3 className="text-lg font-semibold text-slate-900">Greeters & Availability</h3>
                    </div>
                    <div className={cn(shellPadding, "space-y-3")}>
                      {filteredGreeterAvailability.length === 0 ? (
                        <p className="text-sm text-slate-500">No greeters found.</p>
                      ) : (
                        filteredGreeterAvailability.map((greeter) => (
                          <div key={greeter.id} className="rounded-xl border border-slate-200 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-slate-900">{greeter.full_name || "Unnamed greeter"}</p>
                                <p className="text-sm text-slate-500">{greeter.email || "No email"}</p>
                                <p className="mt-1 text-xs text-slate-500">Phone: {greeter.phone || "N/A"}</p>
                              </div>
                              <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", greeter.availability === "available" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800")}>
                                {greeter.availability === "available" ? "Available" : "Unavailable"}
                              </span>
                            </div>
                            <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                              <p>Active jobs: {greeter.assignedJobs.length}</p>
                              <p>Next assignment: {greeter.nextJob ? new Date(greeter.nextJob.date_time).toLocaleString() : "None"}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </section>

                  <section className={panelClass}>
                    <div className="border-b border-slate-200/80 p-4 sm:p-5">
                      <h3 className="text-lg font-semibold text-slate-900">Office Staff & Roles</h3>
                    </div>
                    <div className={cn(shellPadding, "space-y-3")}>
                      {staffError ? (
                        <p className="text-sm text-red-600">{staffError}</p>
                      ) : filteredOfficeStaff.length === 0 ? (
                        <p className="text-sm text-slate-500">No office staff records found.</p>
                      ) : (
                        filteredOfficeStaff.map((staff) => {
                          const fullName = [staff.first_name, staff.last_name].filter(Boolean).join(" ").trim() || "Staff member";
                          return (
                            <div key={staff.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-4">
                              <div>
                                <p className="font-semibold text-slate-900">{fullName}</p>
                                <p className="text-sm text-slate-500">{staff.email || "No email"}</p>
                              </div>
                              <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium capitalize text-blue-700">{staff.role || "user"}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </section>
                </div>
              </div>
            )}

            {activeTab === "passengers" && !isHeathrowOnly && (
              <div className={sectionGap}>
                <section className={cn(cardClass, shellPadding)}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input value={passengerQuery} onChange={(event) => setPassengerQuery(event.target.value)} className="pl-9" placeholder="Search passengers by name, contact details, booking ref, or route" />
                  </div>
                </section>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                  {[{ title: "Future", items: filteredFutureBookings }, { title: "Present", items: filteredPresentBookings }, { title: "Past", items: filteredPastBookings }].map((group) => (
                    <section key={group.title} className={panelClass}>
                      <div className="flex items-center justify-between border-b border-slate-200/80 p-4 sm:p-5">
                        <h3 className="text-lg font-semibold text-slate-900">{group.title}</h3>
                        <span className="text-sm text-slate-500">{group.items.length}</span>
                      </div>
                      <div className={cn(shellPadding, "max-h-[520px] space-y-3 overflow-y-auto")}>
                        {group.items.length === 0 ? (
                          <p className="text-sm text-slate-500">No bookings.</p>
                        ) : (
                          group.items.map((booking) => (
                            <div key={booking.id} className="rounded-xl border border-slate-200 p-4">
                              <p className="font-semibold text-slate-900">{booking.full_name || "Guest passenger"}</p>
                              <p className="text-sm text-slate-600">{booking.booking_ref || booking.id.slice(0, 8)}</p>
                              <p className="mt-1 text-xs text-slate-500">{new Date(booking.date_time).toLocaleString()}</p>
                              <p className="text-xs text-slate-500">{booking.pickup_location} → {booking.dropoff_location || "N/A"}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "bookings" && (
              <div className={sectionGap}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className={metricCardClass}>
                    <p className="text-sm text-slate-500">Total Bookings</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">{totalBookings}</p>
                  </div>
                  <div className={metricCardClass}>
                    <p className="text-sm text-slate-500">Live Jobs</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">{activeJobs}</p>
                  </div>
                  <div className={metricCardClass}>
                    <p className="text-sm text-slate-500">Completed Jobs</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">{completedJobs}</p>
                  </div>
                  <div className={metricCardClass}>
                    <p className="text-sm text-slate-500">Revenue</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">£{totalRevenue.toFixed(2)}</p>
                  </div>
                </div>

                <section className={panelClass}>
                  <div className="flex flex-col gap-3 border-b border-slate-200/80 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Dispatch Board</h3>
                      <p className="text-sm text-slate-500">Confirm bookings, assign greeters, and track each job to completion.</p>
                      <p className={cn("mt-2 text-sm font-medium", emailStatus?.configured ? "text-emerald-700" : "text-amber-700")}>
                        {isEmailStatusLoading
                          ? "Checking email setup..."
                          : emailStatus?.configured
                            ? "Resend is configured and ready."
                            : "Email delivery needs attention."}
                      </p>
                      {emailStatus?.officeDestination && <p className="text-xs text-slate-500">Recipients: {emailStatus.officeDestination}</p>}
                      {emailStatus?.fromEmail && <p className="text-xs text-slate-500">Sender: {emailStatus.fromEmail}</p>}
                      {!isEmailStatusLoading && emailStatus && !emailStatus.configured && emailStatus.missing.length > 0 && (
                        <p className="text-xs text-amber-700">Missing: {emailStatus.missing.join(", ")}</p>
                      )}
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:w-auto">
                      <Input
                        type="email"
                        value={officeInboxInput}
                        onChange={(event) => setOfficeInboxInput(event.target.value)}
                        placeholder="Notification recipients, separated by commas"
                        className="min-w-[260px]"
                        disabled={isEmailStatusLoading || isSavingOfficeInbox}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" onClick={handleSaveOfficeInbox} disabled={isEmailStatusLoading || isSavingOfficeInbox || !officeInboxInput.trim()}>
                          {isSavingOfficeInbox ? "Saving..." : "Save recipients"}
                        </Button>
                        <Button type="button" variant="outline" onClick={handleSendTestEmail} disabled={isSendingEmailTest || isEmailStatusLoading}>
                          {isSendingEmailTest ? "Sending..." : "Send test email"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {isLoadingBookings ? (
                    <div className="p-4 text-sm text-slate-500">Loading bookings...</div>
                  ) : bookingError ? (
                    <div className="p-4 text-sm text-red-500">{bookingError}</div>
                  ) : bookings.length === 0 ? (
                    <div className="p-4 text-sm text-slate-500">No bookings available yet.</div>
                  ) : (
                    <>
                      <div className="space-y-4 p-4 md:hidden">
                        {bookings.filter((booking) => booking.status !== "deleted").map((booking) => (
                          <MobileBookingCard
                            key={booking.id}
                            booking={booking}
                            drivers={drivers}
                            handleUpdateBookingStatus={handleUpdateBookingStatus}
                            handleAssignDriver={handleAssignDriver}
                            handleMarkBookingCompleted={handleMarkBookingCompleted}
                            handleDeleteBooking={handleDeleteBooking}
                          />
                        ))}
                      </div>
                      <div className="hidden overflow-x-auto md:block">
                        <table className="min-w-full text-sm">
                          <thead className="bg-slate-50 text-left text-slate-600">
                            <tr>
                              <th className="p-4">Booking Ref</th>
                              <th className="p-4">Created</th>
                              <th className="p-4">Passenger</th>
                              <th className="p-4">Pickup</th>
                              <th className="p-4">Amount</th>
                              <th className="p-4">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bookings.filter((booking) => booking.status !== "deleted").map((booking) => (
                              <BookingRow
                                key={booking.id}
                                booking={booking}
                                drivers={drivers}
                                handleUpdateBookingStatus={handleUpdateBookingStatus}
                                handleAssignDriver={handleAssignDriver}
                                handleMarkBookingCompleted={handleMarkBookingCompleted}
                                handleDeleteBooking={handleDeleteBooking}
                              />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </section>
              </div>
            )}

            {activeTab === "vehicles" && (
              <VehiclesTab
                vehicles={vehicles}
                isLoadingVehicles={isLoadingVehicles}
                vehicleError={vehicleError}
                fetchVehicles={async () => {
                  const { data, error, isLoading: loading } = await fetchVehicles();
                  setVehicles(data || []);
                  setVehicleError(error);
                  setIsLoadingVehicles(loading);
                }}
              />
            )}

            {activeTab === "payments" && (
              <DriverPaymentsTab
                driverPayments={driverPayments}
                isLoadingPayments={isLoadingPayments}
                paymentError={paymentError}
                drivers={drivers}
                fetchDriverPayments={async () => {
                  const { data, error, isLoading: loading } = await fetchDriverPayments();
                  setDriverPayments(data || []);
                  setPaymentError(error);
                  setIsLoadingPayments(loading);
                }}
              />
            )}

            {activeTab === "invoices" && <InvoicesTab bookings={bookings} isLoadingBookings={isLoadingBookings} bookingError={bookingError} />}

            {activeTab === "priceSettings" && (
              <PriceSettingsTab fetchLocations={fetchLocations} fetchServicePricing={fetchServicePricing} fetchExtraCharges={fetchExtraCharges} />
            )}

            {activeTab === "heathrow" && (
              <div className={sectionGap}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className={metricCardClass}>
                    <p className="text-sm text-slate-500">Heathrow Jobs</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">{heathrowBookings.length}</p>
                  </div>
                  <div className={metricCardClass}>
                    <p className="text-sm text-slate-500">In Progress</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">{heathrowBookings.filter((job) => ["assigned", "accepted", "picked_up"].includes(String(job.driver_status || job.status || ""))).length}</p>
                  </div>
                  <div className={metricCardClass}>
                    <p className="text-sm text-slate-500">Completed</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">{heathrowBookings.filter((job) => job.status === "completed").length}</p>
                  </div>
                </div>

                <section className={panelClass}>
                  <div className="border-b border-slate-200/80 p-4 sm:p-5">
                    <h3 className="text-lg font-semibold text-slate-900">Live Heathrow Jobs</h3>
                    <p className="text-sm text-slate-500">Monitor airport operations, flight status, and service readiness.</p>
                  </div>
                  {heathrowBookings.length === 0 ? (
                    <div className="p-4 text-sm text-slate-500">No Heathrow-related jobs yet.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-left text-slate-600">
                          <tr>
                            <th className="p-4">Booking Ref</th>
                            <th className="p-4">Passenger</th>
                            <th className="p-4">Route</th>
                            <th className="p-4">Service Time</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Flight</th>
                            <th className="p-4">Priority</th>
                          </tr>
                        </thead>
                        <tbody>
                          {heathrowBookings.map((job) => {
                            const flight = getPrimaryFlightNumber(job);
                            const statusInfo = flight ? flightStatuses[flight] : null;
                            return (
                              <tr key={job.id} className="border-b border-slate-100">
                                <td className="p-4">{job.booking_ref || "N/A"}</td>
                                <td className="p-4">{job.full_name || "Guest passenger"}</td>
                                <td className="p-4">{job.pickup_location} → {job.dropoff_location || "N/A"}</td>
                                <td className="p-4">{new Date(job.date_time).toLocaleString()}</td>
                                <td className="p-4">{job.status}</td>
                                <td className="p-4">
                                  {flight
                                    ? `${flight} · ${statusInfo?.status || "Loading"}${statusInfo?.terminal ? ` (${statusInfo.terminal})` : ""} · ${statusInfo?.source === "remote" ? "Live" : "Simulated"}`
                                    : "N/A"}
                                </td>
                                <td className="p-4">{getMonitoringPriority(job.status)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
