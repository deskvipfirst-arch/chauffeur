"use client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ServiceTypeSelectorProps {
  serviceType: "meetAndGreet" | "airportTransfer" | "hourlyHire";
  setServiceType: (value: "meetAndGreet" | "airportTransfer" | "hourlyHire") => void;
}

export default function ServiceTypeSelector({ serviceType, setServiceType }: ServiceTypeSelectorProps) {
  // Handler to ensure the value matches the union type
  const handleServiceTypeChange = (value: string) => {
    // Type assertion since we control the SelectItem values
    setServiceType(value as "meetAndGreet" | "airportTransfer" | "hourlyHire");
  };

  return (
    <Select value={serviceType} onValueChange={handleServiceTypeChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select Service Type" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="meetAndGreet">Meet and Greet</SelectItem>
        <SelectItem value="airportTransfer">Airport Transfer</SelectItem>
        <SelectItem value="hourlyHire">Hire By Hour</SelectItem>
      </SelectContent>
    </Select>
  );
}