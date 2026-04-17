export interface Location {
  id: string;
  name: string;
  type: 'AIRPORT' | 'HOTEL';
  airport?: string;
  terminal?: string;
  address?: string;
  status: 'active' | 'inactive';
}

export interface ServiceRate {
  id: string;
  type: string;
  baseRate: number;
  description?: string;
}

export interface ExtraCharge {
  id: string;
  type?: string;
  amount: number;
  description?: string;
}

export interface Vehicle {
  id: string;
  name: string;
  title: string;
  type: string;
  basePrice: number;
  additionalHourlyRate: number;
  description?: string;
  maxPassengers: number;
  maxBags: number;
  complimentaryDrinks: boolean;
  hasWifi: boolean;
  meetAndGreet: boolean;
  waitingTime: string;
  image?: string;
}

export interface BookingData {
  serviceType: 'MEET_AND_ASSIST' | 'AIRPORT_TRANSFER' | 'HIRE_BY_HOUR';
  dateTime: Date;
  passengers: number;
  locationId: string;
  additionalServices?: {
    buggy?: boolean;
    porter?: boolean;
    bags?: number;
  };
  flightDetails?: {
    arrival?: string;
    departure?: string;
  };
  estimatedPrice: number;
  status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
}

export interface UserData {
  email: string;
  displayName?: string;
  phoneNumber?: string;
  role?: 'USER' | 'ADMIN';
}

// Firestore Collections
export const COLLECTIONS = {
  LOCATIONS: 'locations',
  SERVICE_RATES: 'service_rates',
  EXTRA_CHARGES: 'extra_charges',
  VEHICLES: 'vehicles',
  BOOKINGS: 'bookings',
  USERS: 'users',
  DRIVERS: 'drivers',
  DRIVER_PAYMENTS: 'driverPayments',
} as const; 