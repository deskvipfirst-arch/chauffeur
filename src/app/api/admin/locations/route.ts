import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, status, isAirport, terminals, docName } = body;

    if (!name || !status || docName === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create the document with the provided name or generated name
    const locationRef = doc(db, 'locations', docName);
    
    await setDoc(locationRef, {
      name,
      status,
      isAirport,
      ...(terminals && terminals.length > 0 ? { terminals } : {}),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding location:', error);
    return NextResponse.json(
      { error: 'Failed to add location' },
      { status: 500 }
    );
  }
} 