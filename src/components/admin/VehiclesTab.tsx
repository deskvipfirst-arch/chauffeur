"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Vehicle } from "@/types/admin";
import { Label } from "../ui/label";
import Image from "next/image";
import Notification from "@/components/ui/notification";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

type VehicleFormData = {
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
  image_url: string;
};

type VehiclesTabProps = {
  vehicles: Vehicle[];
  isLoadingVehicles: boolean;
  vehicleError: string | null;
  fetchVehicles: () => Promise<void>;
};

export default function VehiclesTab({
  vehicles,
  isLoadingVehicles,
  vehicleError,
  fetchVehicles
}: VehiclesTabProps) {
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [showEditVehicleModal, setShowEditVehicleModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [newVehicle, setNewVehicle] = useState<VehicleFormData>({
    title: "",
    name: "",
    description: "",
    passengers: 1,
    bags: 0,
    wifi: false,
    meet_greet: false,
    drinks: false,
    waiting_time: "",
    base_price: 0,
    price_per_hour: 0,
    image_url: "",
  });
  const [newVehicleImage, setNewVehicleImage] = useState<File | null>(null);
  const [editVehicleImage, setEditVehicleImage] = useState<File | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string
  } | null>(null);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const resetNewVehicleForm = () => {
    setNewVehicle({
      title: "",
      name: "",
      description: "",
      passengers: 1,
      bags: 0,
      wifi: false,
      meet_greet: false,
      drinks: false,
      waiting_time: "",
      base_price: 0,
      price_per_hour: 0,
      image_url: "",
    });
    setNewVehicleImage(null);
  };

  const handleDatabaseOperation = async (
    operation: () => Promise<void>,
    successMessage: string
  ) => {
    try {
      await operation();
      showNotification("success", successMessage);
      await fetchVehicles();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error occurred";
      console.error("Operation failed:", message);
      showNotification("error", `Operation failed: ${message}`);
    }
  };

  const handleAddVehicle = async () => {
    await handleDatabaseOperation(async () => {
      if (
        !newVehicle.title ||
        !newVehicle.name ||
        newVehicle.passengers <= 0 ||
        newVehicle.bags < 0 ||
        !newVehicle.waiting_time ||
        newVehicle.base_price <= 0
      ) {
        throw new Error("Please fill in all required fields correctly");
      }

      let imageUrl = "";
      if (newVehicleImage) {
        const fileExt = newVehicleImage.name.split(".").pop();
        const fileName = `vehicles/${Date.now()}.${fileExt}`;
        const storageRef = ref(storage, fileName);
        
        await uploadBytes(storageRef, newVehicleImage);
        imageUrl = await getDownloadURL(storageRef);
      }

      const vehiclesRef = collection(db, "vehicles");
      await addDoc(vehiclesRef, {
        ...newVehicle,
        image_url: imageUrl || null,
        created_at: new Date().toISOString(),
      });

      setShowAddVehicleModal(false);
      resetNewVehicleForm();
    }, "Vehicle added successfully");
  };

  const handleEditVehicle = async () => {
    if (!editingVehicle) {
      showNotification("error", "No vehicle selected for editing");
      return;
    }

    await handleDatabaseOperation(async () => {
      if (
        !editingVehicle.title ||
        !editingVehicle.name ||
        editingVehicle.passengers < 1 ||
        editingVehicle.bags < 0 ||
        !editingVehicle.waiting_time ||
        editingVehicle.base_price <= 0
      ) {
        throw new Error("Please fill in all required fields correctly");
      }

      let imageUrl = editingVehicle.image_url || "";

      if (editVehicleImage) {
        const fileExt = editVehicleImage.name.split(".").pop();
        const fileName = `vehicles/${Date.now()}.${fileExt}`;
        const storageRef = ref(storage, fileName);
        
        await uploadBytes(storageRef, editVehicleImage);
        imageUrl = await getDownloadURL(storageRef);
      }

      const { id, ...updateData } = editingVehicle;
      const vehicleRef = doc(db, "vehicles", id);
      await updateDoc(vehicleRef, {
        ...updateData,
        image_url: imageUrl || null,
      });

      setShowEditVehicleModal(false);
      setEditingVehicle(null);
      setEditVehicleImage(null);
    }, "Vehicle updated successfully");
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!window.confirm("Are you sure you want to delete this vehicle? This action cannot be undone.")) {
      return;
    }

    await handleDatabaseOperation(async () => {
      const vehicle = vehicles.find((v) => v.id === vehicleId);
      if (vehicle?.image_url) {
        try {
          const imageRef = ref(storage, vehicle.image_url);
          await deleteObject(imageRef);
        } catch (error) {
          console.warn("Failed to delete associated image:", error);
        }
      }

      const vehicleRef = doc(db, "vehicles", vehicleId);
      await deleteDoc(vehicleRef);
    }, "Vehicle deleted successfully");
  };

  const handleEditClick = (vehicle: Vehicle) => {
    setEditingVehicle({
      ...vehicle,
      title: vehicle.title || "",
      name: vehicle.name || "",
      description: vehicle.description || "",
      passengers: vehicle.passengers || 1,
      bags: vehicle.bags || 0,
      wifi: vehicle.wifi ?? false,
      meet_greet: vehicle.meet_greet ?? false,
      drinks: vehicle.drinks ?? false,
      waiting_time: vehicle.waiting_time || "",
      base_price: vehicle.base_price || 0,
      price_per_hour: vehicle.price_per_hour || 0,
      image_url: vehicle.image_url || "",
    });
    setShowEditVehicleModal(true);
  };

  const ModalFooter = ({ onSave, onCancel, saveLabel = "Save" }: {
    onSave: () => void;
    onCancel: () => void;
    saveLabel?: string;
  }) => (
    <div className="flex gap-2 mt-4">
      <Button onClick={onSave}>{saveLabel}</Button>
      <Button variant="outline" onClick={onCancel}>Cancel</Button>
    </div>
  );

  const renderVehicleFormFields = (
    formData: VehicleFormData,
    setFormData: React.Dispatch<React.SetStateAction<VehicleFormData>>,
    _imageFile: File | null,
    setImageFile: React.Dispatch<React.SetStateAction<File | null>>,
    isEditMode = false
  ) => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          placeholder="e.g., BUSINESS CLASS"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          placeholder="e.g., Mercedes-Benz E-Class"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Vehicle description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <Label htmlFor="passengers">Passengers</Label>
          <Input
            id="passengers"
            type="number"
            min="1"
            placeholder="Number of passengers"
            value={formData.passengers}
            onChange={(e) => setFormData({
              ...formData,
              passengers: parseInt(e.target.value) || 0
            })}
          />
        </div>
        <div className="flex-1">
          <Label htmlFor="bags">Bags</Label>
          <Input
            id="bags"
            type="number"
            min="0"
            placeholder="Number of bags"
            value={formData.bags}
            onChange={(e) => setFormData({
              ...formData,
              bags: parseInt(e.target.value) || 0
            })}
          />
        </div>
      </div>

      <div className="flex gap-4">
        {["wifi", "meet_greet", "drinks"].map((amenity) => (
          <div key={amenity} className="flex items-center gap-2">
            <Checkbox
              id={amenity}
              checked={formData[amenity as keyof VehicleFormData] as boolean}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, [amenity]: checked as boolean })
              }
            />
            <Label htmlFor={amenity}>
              {amenity
                .split("_")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ")}
            </Label>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <Label htmlFor="waiting_time">Waiting Time</Label>
          <Input
            id="waiting_time"
            placeholder="Waiting Time"
            value={formData.waiting_time}
            onChange={(e) => setFormData({ ...formData, waiting_time: e.target.value })}
          />
        </div>
        <div className="flex-1">
          <Label htmlFor="base_price">Base Price (£)</Label>
          <Input
            id="base_price"
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g., 49.99"
            value={formData.base_price}
            onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="flex-1">
          <Label htmlFor="price_per_hour">Price per Hour (£)</Label>
          <Input
            id="price_per_hour"
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g., 15.00"
            value={formData.price_per_hour}
            onChange={(e) => setFormData({ ...formData, price_per_hour: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="vehicle_image">Vehicle Image</Label>
        {isEditMode && formData.image_url && (
          <div className="mb-2">
            <Image
              src={formData.image_url}
              alt="Current vehicle"
              width={128}
              height={128}
              className="w-32 h-32 object-cover rounded"
            />
          </div>
        )}
        <Input
          id="vehicle_image"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && file.type.startsWith("image/") && file.size < 5 * 1024 * 1024) {
              setImageFile(file);
            } else {
              alert("Please upload a valid image under 5MB.");
            }
          }}
        />
      </div>
    </div>
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Manage Vehicles</h2>
        <Button onClick={() => setShowAddVehicleModal(true)}>Add Vehicle</Button>
      </div>

      {notification && (
        <Notification type={notification.type} message={notification.message} />
      )}

      {isLoadingVehicles ? (
        <p className="text-center text-gray-600">Loading vehicles...</p>
      ) : vehicleError ? (
        <p className="text-red-500 text-center">{vehicleError}</p>
      ) : vehicles.length === 0 ? (
        <p className="text-center text-gray-600">No vehicles found.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <table className="w-full text-sm text-gray-700">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4 text-left font-semibold">Image</th>
                <th className="p-4 text-left font-semibold">Title</th>
                <th className="p-4 text-left font-semibold">Name</th>
                <th className="p-4 text-left font-semibold">Passengers</th>
                <th className="p-4 text-left font-semibold">Bags</th>
                <th className="p-4 text-left font-semibold">Base Price</th>
                <th className="p-4 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle) => (
                <tr key={vehicle.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    {vehicle.image_url ? (
                      <Image
                        width={64}
                        height={64}
                        src={vehicle.image_url}
                        alt={vehicle.name}
                        className="object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-gray-500 text-xs">
                        No Image
                      </div>
                    )}
                  </td>
                  <td className="p-4">{vehicle.title}</td>
                  <td className="p-4">{vehicle.name}</td>
                  <td className="p-4">{vehicle.passengers}</td>
                  <td className="p-4">{vehicle.bags}</td>
                  <td className="p-4">£{vehicle.base_price.toFixed(2)}</td>
                  <td className="p-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditClick(vehicle)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteVehicle(vehicle.id)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddVehicleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg">
            <h3 className="text-xl font-bold mb-4">Add New Vehicle</h3>
            {renderVehicleFormFields(newVehicle, setNewVehicle, newVehicleImage, setNewVehicleImage)}
            <ModalFooter
              onSave={handleAddVehicle}
              onCancel={() => {
                setShowAddVehicleModal(false);
                resetNewVehicleForm();
              }}
              saveLabel="Add Vehicle"
            />
          </div>
        </div>
      )}

      {showEditVehicleModal && editingVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg">
            <h3 className="text-xl font-bold mb-4">Edit Vehicle</h3>
            {renderVehicleFormFields(
              editingVehicle as VehicleFormData,
              (newData) => setEditingVehicle((prev) => ({
                ...prev!,
                ...newData,
              })),
              editVehicleImage,
              setEditVehicleImage,
              true
            )}
            <ModalFooter
              onSave={handleEditVehicle}
              onCancel={() => {
                setShowEditVehicleModal(false);
                setEditingVehicle(null);
                setEditVehicleImage(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}