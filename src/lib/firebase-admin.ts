'use server';

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import type { Location, ServiceRate, Vehicle, BookingData, UserData } from './types';
import { COLLECTIONS } from './types';

// Initialize Firebase Admin
const apps = getApps();

if (!apps.length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const adminDb = getFirestore();

// Location Functions
export async function getLocations(): Promise<Location[]> {
  const locationsRef = adminDb.collection(COLLECTIONS.LOCATIONS);
  const q = locationsRef.where('status', '==', 'active');
  const snapshot = await q.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location));
}

export async function updateLocation(id: string, data: Partial<Location>): Promise<Location> {
  const locationRef = adminDb.collection(COLLECTIONS.LOCATIONS).doc(id);
  await locationRef.update(data);
  const updatedDoc = await locationRef.get();
  return { id: updatedDoc.id, ...updatedDoc.data() } as Location;
}

export async function deleteLocation(id: string): Promise<void> {
  const locationRef = adminDb.collection(COLLECTIONS.LOCATIONS).doc(id);
  await locationRef.delete();
}

// Service Rate Functions
export async function getServiceRates(): Promise<ServiceRate[]> {
  const ratesRef = adminDb.collection(COLLECTIONS.SERVICE_RATES);
  const snapshot = await ratesRef.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRate));
}

// Vehicle Functions
export async function getVehicles(): Promise<Vehicle[]> {
  const vehiclesRef = adminDb.collection(COLLECTIONS.VEHICLES);
  const snapshot = await vehiclesRef.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
}

// Booking Functions
export async function createBooking(bookingData: BookingData) {
  const bookingsRef = adminDb.collection(COLLECTIONS.BOOKINGS);
  const newBooking = {
    ...bookingData,
    createdAt: FieldValue.serverTimestamp(),
    status: 'PENDING',
  };
  return await bookingsRef.add(newBooking);
}

export async function getBooking(bookingId: string) {
  const bookingRef = adminDb.collection(COLLECTIONS.BOOKINGS).doc(bookingId);
  const booking = await bookingRef.get();
  return booking.exists ? { id: booking.id, ...booking.data() } : null;
}

// User Functions
export async function createUserProfile(userId: string, userData: UserData) {
  const userRef = adminDb.collection(COLLECTIONS.USERS).doc(userId);
  await userRef.set({
    ...userData,
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function getUserProfile(userId: string) {
  const userRef = adminDb.collection(COLLECTIONS.USERS).doc(userId);
  const user = await userRef.get();
  return user.exists ? { id: user.id, ...user.data() } : null;
} 