import { db } from "@/lib/supabase";
import { collection, getDocs, query, orderBy } from "@/lib/supabase-db";
import { Vehicle, Booking, Driver, DriverPayment, Location, ServicePricing, ExtraCharge } from "@/types/admin";

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
    const bookingsRef = collection(db, "bookings");
    const q = query(bookingsRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      user_id: doc.data().user_id,
      booking_ref: doc.data().booking_ref,
      service_type: doc.data().service_type,
      date_time: doc.data().date_time,
      pickup_location: doc.data().pickup_location,
      dropoff_location: doc.data().dropoff_location,
      amount: doc.data().amount || 0,
      status: doc.data().status || "pending",
      payment_status: doc.data().payment_status,
      stripe_session_id: doc.data().stripe_session_id,
      created_at: doc.data().created_at,
      updated_at: doc.data().updated_at || doc.data().created_at
    })) as Booking[];
    
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
    const driversRef = collection(db, "drivers");
    const snapshot = await getDocs(driversRef);
    const data = snapshot.docs.map(doc => {
      const driver = doc.data();
      return {
        id: doc.id,
        full_name: `${driver.firstName || ""} ${driver.lastName || ""}`.trim(),
        email: driver.email || "",
        phone: driver.phone || "",
        payment_details: driver.paymentDetails || "",
        status: driver.status || "inactive",
      };
    });
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