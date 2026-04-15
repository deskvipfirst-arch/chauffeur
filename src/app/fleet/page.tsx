"use client";
import { useEffect, useState } from "react";
import { Vehicle } from "@/types/admin";
import { fetchVehicles } from "@/lib/adminFetch";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FleetPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadVehicles = async () => {
      try {
        const result = await fetchVehicles();
        if (result.data) {
          setVehicles(result.data.filter(v => v.vehicle_status === "active"));
        }
        if (result.error) {
          setError(result.error);
        }
      } catch (err) {
        setError("Failed to load vehicles");
      } finally {
        setIsLoading(false);
      }
    };

    loadVehicles();
  }, []);

  if (isLoading) return <div className="container mx-auto p-6">Loading...</div>;
  if (error) return <div className="container mx-auto p-6 text-red-500">{error}</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-4xl font-bold mb-8">Our Fleet</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map((vehicle) => (
          <Link href={`/fleet/${vehicle.id}`} key={vehicle.id}>
            <Card className="h-full hover:shadow-lg transition-shadow">
              <div className="relative h-48 w-full">
                {vehicle.image_url ? (
                  <Image
                    src={vehicle.image_url}
                    alt={vehicle.name}
                    fill
                    className="object-cover rounded-t-lg"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-500">No Image</span>
                  </div>
                )}
              </div>
              <CardHeader>
                <CardTitle className="text-xl">{vehicle.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{vehicle.description}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold">Passengers:</span> {vehicle.passengers}
                  </div>
                  <div>
                    <span className="font-semibold">Bags:</span> {vehicle.bags}
                  </div>
                  <div>
                    <span className="font-semibold">Base Price:</span> £{vehicle.base_price}
                  </div>
                  <div>
                    <span className="font-semibold">Per Hour:</span> £{vehicle.price_per_hour}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
} 