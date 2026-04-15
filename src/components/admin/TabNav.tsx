"use client";
import { Button } from "@/components/ui/button";

type TabNavProps = {
  activeTab: "vehicles" | "bookings" | "payments" | "invoices";
  setActiveTab: (tab: "vehicles" | "bookings" | "payments" | "invoices") => void;
};

export default function TabNav({ activeTab, setActiveTab }: TabNavProps) {
  return (
    <div className="flex gap-4 mb-6 border-b">
      <Button
        variant={activeTab === "vehicles" ? "default" : "outline"}
        onClick={() => setActiveTab("vehicles")}
      >
        Vehicles
      </Button>
      <Button
        variant={activeTab === "bookings" ? "default" : "outline"}
        onClick={() => setActiveTab("bookings")}
      >
        Bookings
      </Button>
      <Button
        variant={activeTab === "payments" ? "default" : "outline"}
        onClick={() => setActiveTab("payments")}
      >
        Driver Payments
      </Button>
      <Button
        variant={activeTab === "invoices" ? "default" : "outline"}
        onClick={() => setActiveTab("invoices")}
      >
        Invoices
      </Button>
    </div>
  );
}