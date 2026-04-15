import { NextResponse } from "next/server";
import { getLocations, updateLocation, deleteLocation } from "@/lib/firebase-admin";

// Helper function to extract the id from the URL
const getIdFromUrl = (url: string): string | null => {
  const match = url.match(/\/api\/locations\/([^\/]+)/);
  return match ? match[1] : null;
};

// GET - Fetch a specific location by ID
export async function GET(request: Request) {
  try {
    const id = getIdFromUrl(request.url);
    if (!id) {
      return NextResponse.json(
        { error: "Location ID is required" },
        { status: 400 }
      );
    }

    const locations = await getLocations();
    const location = locations.find(loc => loc.id === id);

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(location);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch location";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// PUT - Update a location by ID
export async function PUT(request: Request) {
  try {
    const id = getIdFromUrl(request.url);
    if (!id) {
      return NextResponse.json(
        { error: "Location ID is required" },
        { status: 400 }
      );
    }

    const updateData = await request.json();
    const updatedLocation = await updateLocation(id, updateData);
    return NextResponse.json(updatedLocation);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to update location";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE - Remove a location by ID
export async function DELETE(request: Request) {
  try {
    const id = getIdFromUrl(request.url);
    if (!id) {
      return NextResponse.json(
        { error: "Location ID is required" },
        { status: 400 }
      );
    }

    await deleteLocation(id);
    return NextResponse.json({ message: "Location deleted successfully" });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to delete location";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}