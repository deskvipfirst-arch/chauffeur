"use client";

import { useState, useEffect } from "react";
import VehiclesTab from "@/components/admin/VehiclesTab";
import DriverPaymentsTab from "@/components/admin/DriverPaymentsTab";
import InvoicesTab from "@/components/admin/InvoicesTab";
import PriceSettingsTab from "@/components/admin/PriceSettingsTab";
import {
  fetchVehicles,
  fetchBookings,
  fetchDrivers,
  fetchDriverPayments,
  fetchLocations,
  fetchServicePricing,
  fetchExtraCharges,
} from "@/lib/adminFetch";
import { Vehicle, Booking, Driver, DriverPayment } from "@/types/admin";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenuItem,
  SidebarTrigger,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { ChevronLeft, ChevronRight, Car, Calendar, DollarSign, FileText, Settings, User, LogOut, Shield, Key } from "lucide-react";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { isAdminUser } from "@/lib/adminUtils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "vehicles" | "bookings" | "payments" | "invoices" | "priceSettings"
  >("bookings");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userEmail, setUserEmail] = useState<string>("");
  const router = useRouter();

  // State for vehicles
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);
  const [vehicleError, setVehicleError] = useState<string | null>(null);

  // State for bookings
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // State for drivers
  const [drivers, setDrivers] = useState<Driver[]>([]);

  // State for driver payments
  const [driverPayments, setDriverPayments] = useState<DriverPayment[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    console.log("Setting up auth state listener...");
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state changed:", user ? "User found" : "No user");
      
      if (!user) {
        console.log("No user found, redirecting to sign in...");
        window.location.replace("/administrator/signin");
        return;
      }

      try {
        console.log("Checking admin status for user:", user.uid);
        const isAdmin = await isAdminUser(user.uid);
        console.log("Is admin:", isAdmin);

        if (!isAdmin) {
          console.log("User is not admin, signing out and redirecting...");
          await auth.signOut();
          window.location.replace("/administrator/signin");
          return;
        }

        console.log("User is admin, setting up dashboard...");
        setIsAuthenticated(true);
        setIsAdmin(true);
        setIsLoading(false);
        setUserEmail(user.email || "");

        // Fetch all data
        console.log("Fetching dashboard data...");
        Promise.all([
          fetchVehicles().then(({ data, error, isLoading }) => {
            setVehicles(data || []);
            setVehicleError(error);
            setIsLoadingVehicles(isLoading);
          }),
          fetchBookings().then(({ data, error, isLoading }) => {
            setBookings(data || []);
            setBookingError(error);
            setIsLoadingBookings(isLoading);
          }),
          fetchDrivers().then(({ data }) => {
            setDrivers(data || []);
          }),
          fetchDriverPayments().then(({ data, error, isLoading }) => {
            setDriverPayments(data || []);
            setPaymentError(error);
            setIsLoadingPayments(isLoading);
          }),
        ]).then(() => {
          console.log("Dashboard data fetched successfully");
        }).catch((error) => {
          console.error("Error fetching dashboard data:", error);
        });
      } catch (error) {
        console.error("Error checking admin status:", error);
        await auth.signOut();
        window.location.replace("/administrator/signin");
      }
    });

    return () => {
      console.log("Cleaning up auth state listener...");
      unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      // Clear session cookie
      document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      toast.success("Successfully signed out");
      window.location.replace("/administrator/signin");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return null; // Will redirect in useEffect
  }

  // Calculate stats
  const totalBookings = bookings.length;
  const websiteVisitors = 1500; // Placeholder, replace with real data
  const meetAndGreetBookings = bookings.filter((b) => b.service_type === "meetAndGreet").length;
  const airportTransferBookings = bookings.filter((b) => b.service_type === "airportTransfer").length;
  const hourlyHireBookings = bookings.filter((b) => b.service_type === "hourlyHire").length;
  const totalRevenue = bookings.reduce((sum, b) => sum + (b.amount || 0), 0);
  const activeDrivers = drivers.filter((d) => d.status === "active").length;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-gray-100 w-full">
        {/* Sidebar */}
        <Sidebar
          className={cn(
            "fixed top-0 left-0 h-full transition-all duration-300 border-r bg-gradient-to-t from-[#1C2526] to-[#323838] text-white z-30",
            isSidebarOpen ? "w-64" : "w-16"
          )}
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            {isSidebarOpen && (
              <h2 className="text-lg font-semibold">Admin Panel</h2>
            )}
            <SidebarTrigger
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className="p-2 rounded-md hover:bg-gray-700"
            >
              {isSidebarOpen ? <ChevronLeft className="h-5 w-5 text-white" /> : <ChevronRight className="h-5 w-5 text-white" />}
            </SidebarTrigger>
          </div>
          <SidebarContent>
            <SidebarGroup className="mt-4">
              <SidebarMenuItem
                onClick={() => setActiveTab("bookings")}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors",
                  activeTab === "bookings" ? "bg-[#007AFF] text-white" : "text-gray-300 hover:bg-gray-700",
                  !isSidebarOpen && "justify-center"
                )}
              >
                <Calendar className="h-5 w-5" />
                {isSidebarOpen && <span>Bookings</span>}
              </SidebarMenuItem>
              <SidebarMenuItem
                onClick={() => setActiveTab("vehicles")}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors",
                  activeTab === "vehicles" ? "bg-[#007AFF] text-white" : "text-gray-300 hover:bg-gray-700",
                  !isSidebarOpen && "justify-center"
                )}
              >
                <Car className="h-5 w-5" />
                {isSidebarOpen && <span>Vehicles</span>}
              </SidebarMenuItem>
              <SidebarMenuItem
                onClick={() => setActiveTab("payments")}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors",
                  activeTab === "payments" ? "bg-[#007AFF] text-white" : "text-gray-300 hover:bg-gray-700",
                  !isSidebarOpen && "justify-center"
                )}
              >
                <DollarSign className="h-5 w-5" />
                {isSidebarOpen && <span>Payments</span>}
              </SidebarMenuItem>
              <SidebarMenuItem
                onClick={() => setActiveTab("invoices")}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors",
                  activeTab === "invoices" ? "bg-[#007AFF] text-white" : "text-gray-300 hover:bg-gray-700",
                  !isSidebarOpen && "justify-center"
                )}
              >
                <FileText className="h-5 w-5" />
                {isSidebarOpen && <span>Invoices</span>}
              </SidebarMenuItem>
              <SidebarMenuItem
                onClick={() => setActiveTab("priceSettings")}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors",
                  activeTab === "priceSettings" ? "bg-[#007AFF] text-white" : "text-gray-300 hover:bg-gray-700",
                  !isSidebarOpen && "justify-center"
                )}
              >
                <Settings className="h-5 w-5" />
                {isSidebarOpen && <span>Price Settings</span>}
              </SidebarMenuItem>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        {/* Main Content */}
        <div
          className={cn(
            "flex-1 transition-all duration-300 w-full bg-gray-100",
            isSidebarOpen ? "ml-64" : "ml-16"
          )}
        >
          {/* Top Navigation Bar */}
          <div className="bg-white border-b px-6 py-3 flex justify-end items-center">
            <DropdownMenu>
              <DropdownMenuTrigger className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/avatars/01.png" alt={userEmail} />
                  <AvatarFallback>{userEmail.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Admin</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {userEmail}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/administrator/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/administrator/add-admin')}>
                  <Shield className="mr-2 h-4 w-4" />
                  <span>Add Admin</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/administrator/change-password')}>
                  <Key className="mr-2 h-4 w-4" />
                  <span>Change Password</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="p-6 w-full">
            {activeTab === "bookings" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white p-4 rounded-lg shadow-md">
                  <h3 className="text-sm font-medium text-gray-500">Total Bookings</h3>
                  <p className="text-2xl font-bold text-gray-900">{totalBookings}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-md">
                  <h3 className="text-sm font-medium text-gray-500">Website Visitors</h3>
                  <p className="text-2xl font-bold text-gray-900">{websiteVisitors}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-md">
                  <h3 className="text-sm font-medium text-gray-500">Meet & Greet Bookings</h3>
                  <p className="text-2xl font-bold text-gray-900">{meetAndGreetBookings}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-md">
                  <h3 className="text-sm font-medium text-gray-500">Airport Transfer Bookings</h3>
                  <p className="text-2xl font-bold text-gray-900">{airportTransferBookings}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-md">
                  <h3 className="text-sm font-medium text-gray-500">Hire By Hour Bookings</h3>
                  <p className="text-2xl font-bold text-gray-900">{hourlyHireBookings}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-md">
                  <h3 className="text-sm font-medium text-gray-500">Total Revenue (£)</h3>
                  <p className="text-2xl font-bold text-gray-900">{totalRevenue.toFixed(2)}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-md">
                  <h3 className="text-sm font-medium text-gray-500">Active Drivers</h3>
                  <p className="text-2xl font-bold text-gray-900">{activeDrivers}</p>
                </div>
              </div>
            )}

            {activeTab === "vehicles" && (
              <VehiclesTab
                vehicles={vehicles}
                isLoadingVehicles={isLoadingVehicles}
                vehicleError={vehicleError}
                fetchVehicles={async () => {
                  const { data, error, isLoading } = await fetchVehicles();
                  setVehicles(data || []);
                  setVehicleError(error);
                  setIsLoadingVehicles(isLoading);
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
                  const { data, error, isLoading } = await fetchDriverPayments();
                  setDriverPayments(data || []);
                  setPaymentError(error);
                  setIsLoadingPayments(isLoading);
                }}
              />
            )}

            {activeTab === "invoices" && (
              <InvoicesTab
                bookings={bookings}
                isLoadingBookings={isLoadingBookings}
                bookingError={bookingError}
              />
            )}

            {activeTab === "priceSettings" && (
              <PriceSettingsTab
                fetchLocations={fetchLocations}
                fetchServicePricing={fetchServicePricing}
                fetchExtraCharges={fetchExtraCharges}
              />
            )}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}