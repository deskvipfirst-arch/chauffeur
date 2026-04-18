import { db, getAccessToken } from "@/lib/supabase";
import { collection, getDocs, query, orderBy } from "@/lib/supabase-db";
import { Vehicle, Booking, Driver, DriverPayment, Location, ServicePricing, ExtraCharge, GreeterInvoice } from "@/types/admin";

type FetchResult<T> = {
  data: T[] | null;
  error: string | null;
  isLoading: boolean;
};

export const fetchVehicles = async (): Promise<FetchResult<Vehicle>> => {
  let isLoading = true;
  try {
    const vehiclesRef = collection(db, "vehicles");
    const q = query(vehiclesRef, orderBy("base_price", "asc"));
    const snapshot = await getDocs(q);
    
    const data = snapshot.docs.map(doc => {
      const vehicle = doc.data();
      return {
        id: doc.id,
        title: vehicle.title || vehicle.Title || "",
        name: vehicle.name || vehicle.Name || "",
        description: vehicle.description || vehicle.Description || "",
        passengers: vehicle.passengers || vehicle.Passengers || 1,
        bags: vehicle.bags || vehicle.Bags || 0,
        wifi: vehicle.wifi ?? vehicle.Wifi ?? false,
        meet_greet: vehicle.meet_greet ?? vehicle.meetGreet ?? false,
        drinks: vehicle.drinks ?? vehicle.Drinks ?? false,
        waiting_time: vehicle.waiting_time || vehicle.waitingTime || "",
        base_price: vehicle.base_price || vehicle.basePrice || 0,
        price_per_hour: vehicle.price_per_hour || vehicle.pricePerHour || 0,
        image_url: vehicle.image_url || vehicle.imageUrl || "",
        created_at: vehicle.created_at || vehicle.createdAt,
        vehicle_status: vehicle.vehicle_status || vehicle.status || "active",
        daily_rate: vehicle.daily_rate || vehicle.dailyRate || 0
      };
    });
    
    isLoading = false;
    return { data, error: null, isLoading };
  } catch (err: unknown) {
    console.error("Error fetching vehicles:", err);
    isLoading = false;
    return { data: null, error: err instanceof Error ? err.message : "Failed to load vehicles", isLoading };
  }
};

export const fetchBookings = async (): Promise<FetchResult<Booking>> => {
  let isLoading = true;
  try {
    const token = await getAccessToken();
    const response = await fetch("/api/admin/bookings", {
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!response.ok) {
      throw new Error("Failed to load bookings");
    }

    const payload = await response.json();
    const data = Array.isArray(payload)
      ? payload.map((item) => ({
          id: item.id,
          user_id: item.user_id,
          booking_ref: item.booking_ref || "",
          service_type: item.service_type || "",
          service_subtype: item.service_subtype || undefined,
          date_time: item.date_time,
          pickup_location: item.pickup_location || "",
          dropoff_location: item.dropoff_location || null,
          amount: Number(item.amount || 0),
          status: item.status || "pending",
          payment_status: item.payment_status || "pending",
          stripe_session_id: item.stripe_session_id || null,
          created_at: item.created_at,
          updated_at: item.updated_at || item.created_at,
          full_name: item.full_name || "",
          email: item.email || "",
          phone: item.phone || "",
          departure_flight: item.flight_number_departure || item.departure_flight || null,
          arrival_flight: item.flight_number_arrival || item.arrival_flight || null,
          passengers: item.passengers || 1,
          luggage: item.bags ?? item.luggage ?? 0,
          bags: item.bags ?? item.luggage ?? 0,
          additional_requests: item.additional_requests || null,
          selected_vehicle: item.selected_vehicle || null,
          duration: item.duration || null,
          duration_unit: item.duration_unit || null,
          driver_id: item.driver_id || null,
          driver_status: item.driver_status || "unassigned",
          dispatch_notes: item.dispatch_notes || null,
          assigned_at: item.assigned_at || null,
          accepted_at: item.accepted_at || null,
          picked_up_at: item.picked_up_at || null,
          completed_at: item.completed_at || null,
          want_buggy: Boolean(item.want_buggy),
          want_porter: Boolean(item.want_porter),
        }))
      : [];

    isLoading = false;
    return { data, error: null, isLoading };
  } catch (err: unknown) {
    console.error("Error fetching bookings:", err);
    isLoading = false;
    return { data: null, error: err instanceof Error ? err.message : "Failed to load bookings", isLoading };
  }
};

export const fetchDrivers = async (): Promise<FetchResult<Driver>> => {
  let isLoading = true;
  try {
    const token = await getAccessToken();
    const response = await fetch("/api/admin/drivers", {
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!response.ok) {
      throw new Error("Failed to load drivers");
    }

    const payload = await response.json();
    const data = Array.isArray(payload)
      ? payload.map((driver) => ({
          id: driver.id,
          full_name: `${driver.firstName || ""} ${driver.lastName || ""}`.trim(),
          email: driver.email || "",
          phone: driver.phone || "",
          payment_details: driver.paymentDetails || "",
          status: driver.status || "inactive",
        }))
      : [];

    isLoading = false;
    return { data, error: null, isLoading };
  } catch (err: unknown) {
    console.error("Error fetching drivers:", err);
    isLoading = false;
    return { data: null, error: err instanceof Error ? err.message : "Failed to load drivers", isLoading };
  }
};

export const fetchDriverPayments = async (): Promise<FetchResult<DriverPayment>> => {
  let isLoading = true;
  try {
    const paymentsRef = collection(db, "driverPayments");
    const q = query(paymentsRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => {
      const payment = doc.data();
      return {
        id: doc.id,
        created_at: payment.createdAt,
        driver_id: payment.driverId,
        booking_id: payment.bookingId,
        amount: payment.amount || 0,
        status: payment.status || "pending",
        payment_date: payment.paymentDate || null,
        payment_method: payment.paymentMethod || "bank_transfer",
      };
    });
    isLoading = false;
    return { data, error: null, isLoading };
  } catch (err: unknown) {
    console.error("Error fetching driver payments:", err);
    isLoading = false;
    return { data: null, error: err instanceof Error ? err.message : "Failed to load driver payments", isLoading };
  }
};

export const fetchGreeterInvoices = async (): Promise<FetchResult<GreeterInvoice>> => {
  let isLoading = true;
  try {
    const token = await getAccessToken();
    const response = await fetch("/api/admin/invoices", {
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (!response.ok) {
      throw new Error("Failed to load greeter invoices");
    }

    const payload = await response.json();
    const data = Array.isArray(payload) ? payload : [];
    isLoading = false;
    return { data, error: null, isLoading };
  } catch (err: unknown) {
    console.error("Error fetching greeter invoices:", err);
    isLoading = false;
    return { data: null, error: err instanceof Error ? err.message : "Failed to load greeter invoices", isLoading };
  }
};

export const fetchLocations = async (): Promise<FetchResult<Location>> => {
  let isLoading = true;
  try {
    const locationsRef = collection(db, "locations");
    const snapshot = await getDocs(locationsRef);
    const data = snapshot.docs.map((doc, index) => ({
      id: index + 1,
      name: doc.data().name || "",
      status: doc.data().status || "active",
      isAirport: doc.data().isAirport || false,
      terminals: doc.data().terminals || []
    }));
    isLoading = false;
    return { data, error: null, isLoading };
  } catch (err: unknown) {
    console.error("Error fetching locations:", err);
    isLoading = false;
    return { data: null, error: err instanceof Error ? err.message : "Failed to load locations", isLoading };
  }
};

export const fetchServicePricing = async (): Promise<FetchResult<ServicePricing>> => {
  let isLoading = true;
  try {
    const response = await fetch("/api/service-rates", { cache: "no-store" });
    if (!response.ok) {
      isLoading = false;
      return { data: [], error: null, isLoading };
    }

    const payload = await response.json();
    const data = Array.isArray(payload)
      ? payload.map((item) => ({
          id: item.id,
          baseRate: item.baseRate ?? 0,
          description: item.description ?? "",
        }))
      : [];

    isLoading = false;
    return { data, error: null, isLoading };
  } catch {
    isLoading = false;
    return { data: [], error: null, isLoading };
  }
};

export const fetchExtraCharges = async (): Promise<FetchResult<ExtraCharge>> => {
  let isLoading = true;
  try {
    const response = await fetch("/api/extra-charges", { cache: "no-store" });
    if (!response.ok) {
      isLoading = false;
      return { data: [], error: null, isLoading };
    }

    const payload = await response.json();
    const data = Array.isArray(payload)
      ? payload.map((item) => ({
          id: item.id,
          amount: item.amount ?? 0,
          description: item.description ?? "",
        }))
      : [];

    isLoading = false;
    return { data, error: null, isLoading };
  } catch {
    isLoading = false;
    return { data: [], error: null, isLoading };
  }
};