import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
const privateKey = process.env.FIREBASE_PRIVATE_KEY 
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : undefined;

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey,
  }),
});

const db = getFirestore(app);

async function initializeCollections() {
  // Locations Collection
  const locations = [
    {
      id: 'heathrow-t2',
      name: 'Heathrow Terminal 2',
      type: 'AIRPORT',
      airport: 'Heathrow',
      terminal: 'Terminal 2',
      status: 'active',
    },
    {
      id: 'heathrow-t3',
      name: 'Heathrow Terminal 3',
      type: 'AIRPORT',
      airport: 'Heathrow',
      terminal: 'Terminal 3',
      status: 'active',
    },
    {
      id: 'heathrow-t4',
      name: 'Heathrow Terminal 4',
      type: 'AIRPORT',
      airport: 'Heathrow',
      terminal: 'Terminal 4',
      status: 'active',
    },
    {
      id: 'heathrow-t5',
      name: 'Heathrow Terminal 5',
      type: 'AIRPORT',
      airport: 'Heathrow',
      terminal: 'Terminal 5',
      status: 'active',
    },
    {
      id: 'gatwick-north',
      name: 'Gatwick North Terminal',
      type: 'AIRPORT',
      airport: 'Gatwick',
      terminal: 'North Terminal',
      status: 'active',
    },
    {
      id: 'gatwick-south',
      name: 'Gatwick South Terminal',
      type: 'AIRPORT',
      airport: 'Gatwick',
      terminal: 'South Terminal',
      status: 'active',
    },
  ];

  // Service Rates Collection
  const serviceRates = [
    {
      id: 'meet-assist-base',
      type: 'MEET_AND_ASSIST',
      baseRate: 140,
      description: 'Base rate for Meet and Assist service',
    },
    {
      id: 'meet-assist-connection',
      type: 'MEET_AND_ASSIST_CONNECTION',
      baseRate: 280,
      description: 'Base rate for Meet and Assist connection service',
    },
    {
      id: 'airport-transfer-base',
      type: 'AIRPORT_TRANSFER',
      baseRate: 100,
      description: 'Base rate for Airport Transfer service',
    },
  ];

  // Vehicles Collection
  const vehicles = [
    {
      id: 'sedan',
      name: 'Luxury Sedan',
      type: 'SEDAN',
      basePrice: 180,
      standardHours: 10,
      additionalHourRate: 50,
      maxPassengers: 3,
      description: 'Perfect for up to 3 passengers with 2 large suitcases',
    },
    {
      id: 'suv',
      name: 'Executive SUV',
      type: 'SUV',
      basePrice: 250,
      standardHours: 10,
      additionalHourRate: 65,
      maxPassengers: 5,
      description: 'Ideal for up to 5 passengers with 4 large suitcases',
    },
    {
      id: 'van',
      name: 'Luxury Van',
      type: 'VAN',
      basePrice: 300,
      standardHours: 10,
      additionalHourRate: 80,
      maxPassengers: 7,
      description: 'Spacious van for up to 7 passengers with 6 large suitcases',
    },
  ];

  // Extra Charges Collection
  const extraCharges = [
    {
      id: 'unsocial-hours',
      type: 'UNSOCIAL_HOURS',
      amount: 60,
      description: 'Additional charge for services between 22:00 and 06:00',
    },
    {
      id: 'festive-multiplier',
      type: 'FESTIVE_MULTIPLIER',
      amount: 2,
      description: 'Multiplier for services during festive periods',
    },
    {
      id: 'additional-passenger',
      type: 'ADDITIONAL_PASSENGER',
      amount: 45,
      description: 'Charge per additional passenger beyond 2 passengers',
    },
    {
      id: 'buggy-service',
      type: 'BUGGY_SERVICE',
      amount: 80,
      description: 'Charge for buggy service at Heathrow airport',
    },
    {
      id: 'porter-service',
      type: 'PORTER_SERVICE',
      amount: 65,
      description: 'Charge per porter (each porter handles up to 8 bags)',
    },
  ];

  try {
    // Create collections and documents
    const batch = db.batch();

    // Locations
    locations.forEach((location) => {
      const ref = db.collection('locations').doc(location.id);
      batch.set(ref, location);
    });

    // Service Rates
    serviceRates.forEach((rate) => {
      const ref = db.collection('service_rates').doc(rate.id);
      batch.set(ref, rate);
    });

    // Vehicles
    vehicles.forEach((vehicle) => {
      const ref = db.collection('vehicles').doc(vehicle.id);
      batch.set(ref, vehicle);
    });

    // Extra Charges
    extraCharges.forEach((charge) => {
      const ref = db.collection('extra_charges').doc(charge.id);
      batch.set(ref, charge);
    });

    await batch.commit();
    console.log('Successfully initialized all collections');
  } catch (error) {
    console.error('Error initializing collections:', error);
  }
}

initializeCollections().then(() => process.exit(0)); 