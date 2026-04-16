import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase-admin';

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

    await adminDb.collection('locations').doc(docName).set({
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