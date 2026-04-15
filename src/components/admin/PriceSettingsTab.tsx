"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ServicePricing, ExtraCharge, Location } from "@/types/admin";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface FetchResult<T> {
  data: T[] | null;
  error: string | null;
  isLoading: boolean;
}

export default function PriceSettingsTab({
  fetchLocations,
  fetchServicePricing,
  fetchExtraCharges,
}: {
  fetchLocations: () => Promise<FetchResult<Location>>;
  fetchServicePricing: () => Promise<FetchResult<ServicePricing>>;
  fetchExtraCharges: () => Promise<FetchResult<ExtraCharge>>;
}) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [servicePricing, setServicePricing] = useState<ServicePricing[]>([]);
  const [isLoadingPricing, setIsLoadingPricing] = useState(true);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [newPricing, setNewPricing] = useState({ id: "", baseRate: 0, description: "" });

  const [extraCharges, setExtraCharges] = useState<ExtraCharge[]>([]);
  const [isLoadingCharges, setIsLoadingCharges] = useState(true);
  const [chargeError, setChargeError] = useState<string | null>(null);
  const [newExtraCharge, setNewExtraCharge] = useState({ id: "", amount: 0, description: "" });

  const [isAddLocationOpen, setIsAddLocationOpen] = useState(false);
  const [modalLocation, setModalLocation] = useState({ 
    name: "", 
    status: "active",
    isAirport: false,
    terminals: [] as string[]
  });
  const [newTerminal, setNewTerminal] = useState("");

  const [showAddServicePricingModal, setShowAddServicePricingModal] = useState(false);
  const [showAddExtraChargeModal, setShowAddExtraChargeModal] = useState(false);

  const fetchData = useCallback(async () => {
    const [locationsRes, pricingRes, chargesRes] = await Promise.all([
      fetchLocations(),
      fetchServicePricing(),
      fetchExtraCharges(),
    ]);
    setLocations(locationsRes.data || []);
    setLocationError(locationsRes.error);
    setIsLoadingLocations(locationsRes.isLoading);
    setServicePricing(pricingRes.data || []);
    setPricingError(pricingRes.error);
    setIsLoadingPricing(pricingRes.isLoading);
    setExtraCharges(chargesRes.data || []);
    setChargeError(chargesRes.error);
    setIsLoadingCharges(chargesRes.isLoading);
  }, [fetchLocations, fetchServicePricing, fetchExtraCharges]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  const updateLocationStatus = async (id: number, status: "active" | "inactive") => {
    const response = await fetch(`/api/admin/locations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const result = await response.json();
    if (!response.ok) {
      setLocationError(result.error || "Failed to update status");
      return;
    }
    fetchData();
  };

  const addServicePricing = async (serviceRate: { id: string; baseRate: number; description: string }) => {
    if (!serviceRate.id || !serviceRate.baseRate) return;
    const response = await fetch("/api/admin/service-rates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(serviceRate),
    });
    const result = await response.json();
    if (!response.ok) {
      setPricingError(result.error || "Failed to add service rate");
      return;
    }
    fetchData();
  };

  const updateServicePricing = async (id: string, baseRate: number, description: string) => {
    if (!id || !baseRate) return;
    const response = await fetch(`/api/admin/service-rates/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baseRate, description }),
    });
    const result = await response.json();
    if (!response.ok) {
      setPricingError(result.error || "Failed to update service rate");
      return;
    }
    fetchData();
  };

  const addExtraCharge = async (charge: { id: string; amount: number; description: string }) => {
    if (!charge.id || !charge.amount) return;
    const response = await fetch("/api/admin/extra-charges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(charge),
    });
    const result = await response.json();
    if (!response.ok) {
      setChargeError(result.error || "Failed to add extra charge");
      return;
    }
    fetchData();
  };

  const updateExtraCharge = async (id: string, amount: number, description: string) => {
    if (!id || !amount) return;
    const response = await fetch(`/api/admin/extra-charges/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, description }),
    });
    const result = await response.json();
    if (!response.ok) {
      setChargeError(result.error || "Failed to update extra charge");
      return;
    }
    fetchData();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Manage Locations</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingLocations ? (
            <p className="text-center">Loading locations...</p>
          ) : locationError ? (
            <p className="text-red-500">{locationError}</p>
          ) : (
            <>
              <div className="flex gap-2 mb-4">
                <Button onClick={() => {
                  setModalLocation({ name: "", status: "active", isAirport: false, terminals: [] });
                  setIsAddLocationOpen(true);
                }}>Add Location</Button>
              </div>
              <Dialog open={isAddLocationOpen} onOpenChange={setIsAddLocationOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Location</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Location Name"
                      value={modalLocation.name}
                      onChange={e => setModalLocation({ ...modalLocation, name: e.target.value })}
                    />
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isAirport"
                        checked={modalLocation.isAirport}
                        onCheckedChange={(checked) => 
                          setModalLocation({ 
                            ...modalLocation, 
                            isAirport: checked as boolean,
                            terminals: checked ? modalLocation.terminals : []
                          })
                        }
                      />
                      <Label htmlFor="isAirport">This is an airport</Label>
                    </div>
                    
                    {modalLocation.isAirport && (
                      <div className="space-y-2">
                        <Label>Terminals (Optional)</Label>
                        <div className="flex space-x-2">
                          <Input
                            placeholder="Add terminal (e.g. T1, T2)"
                            value={newTerminal}
                            onChange={e => setNewTerminal(e.target.value)}
                          />
                          <Button
                            type="button"
                            onClick={() => {
                              if (newTerminal.trim()) {
                                setModalLocation({
                                  ...modalLocation,
                                  terminals: [...modalLocation.terminals, newTerminal.trim()]
                                });
                                setNewTerminal("");
                              }
                            }}
                          >
                            Add
                          </Button>
                        </div>
                        {modalLocation.terminals.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {modalLocation.terminals.map((terminal, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="flex items-center gap-1"
                              >
                                {terminal}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="h-4 w-4 p-0 hover:bg-transparent"
                                  onClick={() => {
                                    setModalLocation({
                                      ...modalLocation,
                                      terminals: modalLocation.terminals.filter((_, i) => i !== index)
                                    });
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <Select
                      value={modalLocation.status}
                      onValueChange={value => setModalLocation({ ...modalLocation, status: value as "active" | "inactive" })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={async () => {
                        if (!modalLocation.name) return;
                        
                        // Create document name based on airport status and terminals
                        let docName = modalLocation.name.toLowerCase().replace(/\s+/g, '-');
                        
                        if (modalLocation.isAirport && modalLocation.terminals.length > 0) {
                          // Create a separate document for each terminal
                          for (const terminal of modalLocation.terminals) {
                            const terminalDocName = `${docName}-${terminal.toLowerCase()}`;
                            const response = await fetch("/api/admin/locations", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                ...modalLocation,
                                name: `${modalLocation.name} ${terminal}`,
                                docName: terminalDocName
                              }),
                            });
                            
                            if (!response.ok) {
                              const result = await response.json();
                              setLocationError(result.error || "Failed to add location");
                              return;
                            }
                          }
                        } else {
                          // Create a single document for non-airport or airport without terminals
                          const response = await fetch("/api/admin/locations", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              ...modalLocation,
                              docName
                            }),
                          });
                          
                          if (!response.ok) {
                            const result = await response.json();
                            setLocationError(result.error || "Failed to add location");
                            return;
                          }
                        }
                        
                        setModalLocation({ name: "", status: "active", isAirport: false, terminals: [] });
                        setNewTerminal("");
                        setIsAddLocationOpen(false);
                        fetchData();
                      }}
                      disabled={!modalLocation.name}
                    >
                      Add Location
                    </Button>
                    <Button variant="outline" onClick={() => {
                      setModalLocation({ name: "", status: "active", isAirport: false, terminals: [] });
                      setNewTerminal("");
                      setIsAddLocationOpen(false);
                    }}>
                      Cancel
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              {locationError && <p className="text-red-500">{locationError}</p>}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Location Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locations.map((location) => (
                    <TableRow key={location.id}>
                      <TableCell>{location.name}</TableCell>
                      <TableCell>
                        <Select
                          value={location.status}
                          onValueChange={(value) => updateLocationStatus(location.id, value as "active" | "inactive")}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {/* Optionally add delete button */}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage Service Pricing</CardTitle>
          <Button className="mt-2" onClick={() => setShowAddServicePricingModal(true)}>Add Service Pricing</Button>
        </CardHeader>
        <CardContent>
          {isLoadingPricing ? (
            <p className="text-center">Loading service pricing...</p>
          ) : pricingError ? (
            <p className="text-red-500">{pricingError}</p>
          ) : (
            <>
              <Dialog open={showAddServicePricingModal} onOpenChange={setShowAddServicePricingModal}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Service Pricing</DialogTitle>
                  </DialogHeader>
                  <Input
                    placeholder="ID (e.g. airport-transfer-base)"
                    value={newPricing.id || ""}
                    onChange={e => setNewPricing({ ...newPricing, id: e.target.value })}
                  />
                  <Input
                    placeholder="Base Rate"
                    type="number"
                    value={newPricing.baseRate || ""}
                    onChange={e => setNewPricing({ ...newPricing, baseRate: Number(e.target.value) })}
                  />
                  <Input
                    placeholder="Description"
                    value={newPricing.description || ""}
                    onChange={e => setNewPricing({ ...newPricing, description: e.target.value })}
                  />
                  <DialogFooter>
                    <Button onClick={async () => {
                      await addServicePricing(newPricing);
                      setNewPricing({ id: "", baseRate: 0, description: "" });
                      setShowAddServicePricingModal(false);
                      fetchData();
                    }} disabled={!newPricing.id || !newPricing.baseRate}>Add</Button>
                    <Button variant="outline" onClick={() => setShowAddServicePricingModal(false)}>Cancel</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Base Rate (£)</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {servicePricing.map((pricing) => (
                    <TableRow key={pricing.id}>
                      <TableCell>{pricing.id}</TableCell>
                      <TableCell>
                        <Input
                          value={pricing.description}
                          onChange={e => updateServicePricing(pricing.id, pricing.baseRate, e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={pricing.baseRate}
                          onChange={e => updateServicePricing(pricing.id, Number(e.target.value), pricing.description)}
                        />
                      </TableCell>
                      <TableCell>
                        {/* Optionally add delete button */}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage Extra Charges</CardTitle>
          <Button className="mt-2" onClick={() => setShowAddExtraChargeModal(true)}>Add Extra Charge</Button>
        </CardHeader>
        <CardContent>
          {isLoadingCharges ? (
            <p className="text-center">Loading extra charges...</p>
          ) : chargeError ? (
            <p className="text-red-500">{chargeError}</p>
          ) : (
            <>
              <Dialog open={showAddExtraChargeModal} onOpenChange={setShowAddExtraChargeModal}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Extra Charge</DialogTitle>
                  </DialogHeader>
                  <Input
                    placeholder="ID (e.g. additional-hour)"
                    value={newExtraCharge.id || ""}
                    onChange={e => setNewExtraCharge({ ...newExtraCharge, id: e.target.value })}
                  />
                  <Input
                    placeholder="Amount"
                    type="number"
                    value={newExtraCharge.amount || ""}
                    onChange={e => setNewExtraCharge({ ...newExtraCharge, amount: Number(e.target.value) })}
                  />
                  <Input
                    placeholder="Description"
                    value={newExtraCharge.description || ""}
                    onChange={e => setNewExtraCharge({ ...newExtraCharge, description: e.target.value })}
                  />
                  <DialogFooter>
                    <Button onClick={async () => {
                      await addExtraCharge(newExtraCharge);
                      setNewExtraCharge({ id: "", amount: 0, description: "" });
                      setShowAddExtraChargeModal(false);
                      fetchData();
                    }} disabled={!newExtraCharge.id || !newExtraCharge.amount}>Add</Button>
                    <Button variant="outline" onClick={() => setShowAddExtraChargeModal(false)}>Cancel</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount (£)</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {extraCharges.map((charge) => (
                    <TableRow key={charge.id}>
                      <TableCell>{charge.id}</TableCell>
                      <TableCell>
                        <Input
                          value={charge.description}
                          onChange={e => updateExtraCharge(charge.id, charge.amount, e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={charge.amount}
                          onChange={e => updateExtraCharge(charge.id, Number(e.target.value), charge.description)}
                        />
                      </TableCell>
                      <TableCell>
                        {/* Optionally add delete button */}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}