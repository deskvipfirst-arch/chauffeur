"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DriverPayment, Driver } from "@/types/admin";
import { Label } from "../ui/label";
import Notification from "@/components/ui/notification";
import { supabase } from "@/lib/supabase/browser";
import { COLLECTIONS } from "@/lib/types";

type DriverPaymentsTabProps = {
  driverPayments: DriverPayment[];
  isLoadingPayments: boolean;
  paymentError: string | null;
  drivers: Driver[];
  fetchDriverPayments: () => Promise<void>;
};

type PaymentFormState = {
  driver_id: string;
  booking_id: string;
  amount: number | "";
  status: "pending" | "paid" | "cancelled";
  payment_date: string | null;
  payment_method: string;
};

export default function DriverPaymentsTab({
  driverPayments,
  isLoadingPayments,
  paymentError,
  drivers,
  fetchDriverPayments
}: DriverPaymentsTabProps) {
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showEditPaymentModal, setShowEditPaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<DriverPayment | null>(null);
  const [newPayment, setNewPayment] = useState<PaymentFormState>({
    driver_id: "",
    booking_id: "",
    amount: "",
    status: "pending",
    payment_date: null,
    payment_method: "bank_transfer",
  });
  const [notification, setNotification] = useState<{ 
    type: "success" | "error"; 
    message: string 
  } | null>(null);
  const [editPaymentForm, setEditPaymentForm] = useState<PaymentFormState | null>(null);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const resetNewPaymentForm = () => {
    setNewPayment({
      driver_id: "",
      booking_id: "",
      amount: "",
      status: "pending",
      payment_date: null,
      payment_method: "bank_transfer",
    });
  };

  const closeAddPaymentModal = () => {
    setShowAddPaymentModal(false);
    resetNewPaymentForm();
  };

  const closeEditPaymentModal = () => {
    setShowEditPaymentModal(false);
    setEditingPayment(null);
    setEditPaymentForm(null);
  };

  const handleDatabaseOperation = async (
    operation: () => Promise<void>,
    successMessage: string
  ) => {
    try {
      await operation();
      showNotification("success", successMessage);
      await fetchDriverPayments();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error occurred";
      console.error("Operation failed:", message);
      showNotification("error", `Operation failed: ${message}`);
    }
  };

  const handleAddPayment = async () => {
    await handleDatabaseOperation(async () => {
      if (!newPayment.driver_id || !newPayment.booking_id || !newPayment.amount || Number(newPayment.amount) <= 0) {
        throw new Error("Please fill in all required fields correctly");
      }
      const { error: insertError } = await supabase.from(COLLECTIONS.DRIVER_PAYMENTS).insert({
        ...newPayment,
        amount: Number(newPayment.amount),
        created_at: new Date().toISOString(),
      });
      if (insertError) throw insertError;
      closeAddPaymentModal();
    }, "Payment added successfully");
  };

  const handleEditPayment = async () => {
    if (!editingPayment || !editPaymentForm) {
      showNotification("error", "No payment selected for editing");
      return;
    }
    await handleDatabaseOperation(async () => {
      if (!editPaymentForm.driver_id || !editPaymentForm.booking_id || !editPaymentForm.amount || Number(editPaymentForm.amount) <= 0) {
        throw new Error("Please fill in all required fields correctly");
      }
      const { id } = editingPayment;
      const { error: updateError } = await supabase.from(COLLECTIONS.DRIVER_PAYMENTS).update({
        ...editPaymentForm,
        amount: Number(editPaymentForm.amount),
      }).eq("id", id);
      if (updateError) throw updateError;
      closeEditPaymentModal();
    }, "Payment updated successfully");
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!window.confirm("Are you sure you want to delete this payment? This action cannot be undone.")) {
      return;
    }
    await handleDatabaseOperation(async () => {
      const { error: deleteError } = await supabase.from(COLLECTIONS.DRIVER_PAYMENTS).delete().eq("id", paymentId);
      if (deleteError) throw deleteError;
    }, "Payment deleted successfully");
  };

  const handleEditClick = (payment: DriverPayment) => {
    setEditingPayment(payment);
    setEditPaymentForm({
      driver_id: payment.driver_id,
      booking_id: payment.booking_id,
      amount: payment.amount,
      status: payment.status as 'pending' | 'paid' | 'cancelled',
      payment_date: payment.payment_date ? String(payment.payment_date) : null,
      payment_method: payment.payment_method,
    });
    setShowEditPaymentModal(true);
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

  const renderPaymentFormFields = (
    formData: PaymentFormState,
    setFormData: React.Dispatch<React.SetStateAction<PaymentFormState>>,
  ) => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="driver_id">Driver</Label>
        <select
          id="driver_id"
          value={formData.driver_id}
          onChange={(e) => setFormData({ ...formData, driver_id: e.target.value })}
          className="w-full p-2 border rounded"
        >
          <option value="">Select a driver</option>
          {drivers.map((driver) => (
            <option key={driver.id} value={driver.id}>
              {driver.full_name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="booking_id">Booking ID</Label>
        <Input
          id="booking_id"
          value={formData.booking_id}
          onChange={(e) => setFormData({ ...formData, booking_id: e.target.value })}
          placeholder="Enter booking ID"
        />
      </div>

      <div>
        <Label htmlFor="amount">Amount (£)</Label>
        <Input
          id="amount"
          type="number"
          min="0"
          step="0.01"
          value={formData.amount}
          onChange={(e) => {
            const val = e.target.value;
            setFormData({ ...formData, amount: val === "" ? "" : parseFloat(val) });
          }}
          placeholder="Enter amount"
        />
      </div>

      <div>
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value as 'pending' | 'paid' | 'cancelled' })}
          className="w-full p-2 border rounded"
        >
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div>
        <Label htmlFor="payment_method">Payment Method</Label>
        <select
          id="payment_method"
          value={formData.payment_method}
          onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
          className="w-full p-2 border rounded"
        >
          <option value="bank_transfer">Bank Transfer</option>
          <option value="cash">Cash</option>
          <option value="other">Other</option>
        </select>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-3xl font-bold text-gray-800">Manage Driver Payments</h2>
        <Button onClick={() => setShowAddPaymentModal(true)}>Add Payment</Button>
      </div>

      {notification && (
        <Notification type={notification.type} message={notification.message} />
      )}

      {isLoadingPayments ? (
        <p className="text-center text-gray-600">Loading payments...</p>
      ) : paymentError ? (
        <p className="text-red-500 text-center">{paymentError}</p>
      ) : driverPayments.length === 0 ? (
        <p className="text-center text-gray-600">No payments found.</p>
      ) : (
        <>
          <div className="space-y-4 md:hidden">
            {driverPayments.map((payment) => (
              <div key={payment.id} className="rounded-xl bg-white p-4 shadow-lg">
                <div className="grid gap-3 text-sm text-gray-700 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Driver</p>
                    <p className="font-semibold text-gray-900">
                      {drivers.find((d) => d.id === payment.driver_id)?.full_name || "Unknown Driver"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Booking ID</p>
                    <p className="break-all">{payment.booking_id}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Amount</p>
                    <p className="font-semibold text-gray-900">£{payment.amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Status</p>
                    <p>{payment.status}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Payment Method</p>
                    <p>{payment.payment_method}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEditClick(payment)}>
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeletePayment(payment.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-xl bg-white shadow-lg md:block">
            <table className="w-full text-sm text-gray-700">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-4 text-left font-semibold">Driver</th>
                  <th className="p-4 text-left font-semibold">Booking ID</th>
                  <th className="p-4 text-left font-semibold">Amount</th>
                  <th className="p-4 text-left font-semibold">Status</th>
                  <th className="p-4 text-left font-semibold">Payment Method</th>
                  <th className="p-4 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {driverPayments.map((payment) => (
                    <tr key={payment.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                      {drivers.find((d) => d.id === payment.driver_id)?.full_name || "Unknown Driver"}
                      </td>
                    <td className="p-4">{payment.booking_id}</td>
                      <td className="p-4">£{payment.amount.toFixed(2)}</td>
                    <td className="p-4">{payment.status}</td>
                      <td className="p-4">{payment.payment_method}</td>
                    <td className="p-4 flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                        onClick={() => handleEditClick(payment)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeletePayment(payment.id)}
                      >
                        Delete
                          </Button>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showAddPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-4 shadow-lg sm:p-6">
            <h3 className="text-xl font-bold mb-4">Add New Payment</h3>
            {renderPaymentFormFields(newPayment, setNewPayment)}
            <ModalFooter
              onSave={handleAddPayment}
              onCancel={closeAddPaymentModal}
              saveLabel="Add Payment"
            />
          </div>
        </div>
      )}

      {showEditPaymentModal && editPaymentForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-4 shadow-lg sm:p-6">
            <h3 className="text-xl font-bold mb-4">Edit Payment</h3>
            {renderPaymentFormFields(editPaymentForm, setEditPaymentForm as React.Dispatch<React.SetStateAction<PaymentFormState>>)}
            <ModalFooter
              onSave={handleEditPayment}
              onCancel={closeEditPaymentModal}
            />
          </div>
        </div>
      )}
    </div>
  );
}

