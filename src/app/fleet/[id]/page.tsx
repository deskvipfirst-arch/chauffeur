"use client";
import { useEffect, useState } from "react";
import { Vehicle } from "@/types/admin";
import { fetchVehicles } from "@/lib/adminFetch";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, Briefcase, Wifi, Coffee, Clock } from "lucide-react";

export default function VehiclePage({ params }: { params: { id: string } }) {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loadVehicle = async () => {
      try {
        const result = await fetchVehicles();
        if (result.data) {
          const foundVehicle = result.data.find(v => v.id === params.id);
          if (foundVehicle) {
            setVehicle(foundVehicle);
          } else {
            setError("Vehicle not found");
          }
        }
        if (result.error) {
          setError(result.error);
        }
      } catch (err) {
        setError("Failed to load vehicle details");
      } finally {
        setIsLoading(false);
      }
    };

    loadVehicle();
  }, [params.id]);

  if (isLoading) return <div className="container mx-auto p-6">Loading...</div>;
  if (error) return <div className="container mx-auto p-6 text-red-500">{error}</div>;
  if (!vehicle) return <div className="container mx-auto p-6">Vehicle not found</div>;

  return (
    <div className="container mx-auto p-6">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => router.back()}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Fleet
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="relative h-[400px] lg:h-[600px] w-full">
          {vehicle.image_url ? (
            <Image
              src={vehicle.image_url}
              alt={vehicle.name}
              fill
              className="object-cover rounded-lg"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
              <span className="text-gray-500">No Image</span>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">{vehicle.title}</h1>
            <p className="text-xl text-gray-600">{vehicle.name}</p>
          </div>

          <p className="text-gray-700">{vehicle.description}</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-gray-500" />
              <span>{vehicle.passengers} Passengers</span>
            </div>
            <div className="flex items-center space-x-2">
              <Briefcase className="h-5 w-5 text-gray-500" />
              <span>{vehicle.bags} Bags</span>
            </div>
            {vehicle.wifi && (
              <div className="flex items-center space-x-2">
                <Wifi className="h-5 w-5 text-gray-500" />
                <span>Free WiFi</span>
              </div>
            )}
            {vehicle.drinks && (
              <div className="flex items-center space-x-2">
                <Coffee className="h-5 w-5 text-gray-500" />
                <span>Complimentary Drinks</span>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-gray-500" />
              <span>{vehicle.waiting_time} Waiting Time</span>
            </div>
          </div>

          <div className="border-t pt-6">
            <h2 className="text-2xl font-semibold mb-4">Pricing</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600">Base Price</p>
                <p className="text-2xl font-bold">£{vehicle.base_price}</p>
              </div>
              <div>
                <p className="text-gray-600">Per Hour Rate</p>
                <p className="text-2xl font-bold">£{vehicle.price_per_hour}</p>
              </div>
            </div>
          </div>

          <Button
            className="w-full"
            onClick={() => router.push(`/?vehicle=${vehicle.id}&service_type=hire_by_hour#estimate`)}
          >
            Book This Vehicle
          </Button>
        </div>
      </div>
    </div>
  );
} 