export type DriverStatus = "unassigned" | "assigned" | "accepted" | "picked_up" | "completed";

export type Vehicle = {
  id: string;
  title: string;
  name: string;
  description: string;
  passengers: number;
  bags: number;
  wifi: boolean;
  meet_greet: boolean;
  drinks: boolean;
  waiting_time: string;
  base_price: number;
  price_per_hour: number;
  image_url?: string;
  created_at?: string;
  vehicle_status: string;
  daily_rate: number;
};

export type Booking = {
  id: string;
  user_id: string;
  booking_ref: string;
  service_type: string;
  service_subtype?: string;
  date_time: string;
  pickup_location: string;
  dropoff_location?: string | null;
  amount: number;
  status: string;
  payment_status?: string;
  stripe_session_id?: string | null;
  created_at: string;
  updated_at: string;
  full_name?: string;
  email?: string;
  phone?: string;
  departure_flight?: string | null;
  arrival_flight?: string | null;
  flight_number_arrival?: string | null;
  flight_number_departure?: string | null;
  passengers?: number;
  luggage?: number | null;
  bags?: number | null;
  additional_requests?: string | null;
  selected_vehicle?: string | null;
  is_hire_by_hour?: boolean | null;
  duration?: number | null;
  duration_unit?: string | null;
  driver_id?: string | null;
  driver_status?: DriverStatus | null;
  dispatch_notes?: string | null;
  assigned_at?: string | null;
  accepted_at?: string | null;
  picked_up_at?: string | null;
  completed_at?: string | null;
  terminal?: string | null;
  additional_hours?: number | null;
  want_buggy?: boolean;
  want_porter?: boolean;
};

export type Driver = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  payment_details: string;
  status: string;
};

export type DriverPayment = {
  id: string;
  created_at: string;
  driver_id: string;
  booking_id: string;
  amount: number;
  status: string;
  payment_date: string | null;
  payment_method: string;
};

export type GreeterInvoiceStatus = "submitted" | "under_review" | "queried" | "approved" | "rejected" | "paid" | "unpaid";

export type GreeterInvoice = {
  id: string;
  booking_id: string;
  booking_ref?: string | null;
  greeter_id?: string | null;
  greeter_email: string;
  amount: number;
  notes?: string | null;
  office_status: GreeterInvoiceStatus;
  office_notes?: string | null;
  submitted_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  processed_at?: string | null;
  payment_reference?: string | null;
};

export interface Location {
  id: number;
  name: string;
  status: "active" | "inactive";
  isAirport: boolean;
  terminals?: string[];
}

export interface ServicePricing {
  id: string;
  baseRate: number;
  description: string;
}


export interface ExtraCharge {
  id: string;
  amount: number;
  description: string;
}

