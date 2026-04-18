"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Booking, GreeterInvoice, GreeterInvoiceStatus } from "@/types/admin";
import { toast } from "react-hot-toast";
import { getInvoiceStatusLabel, getOfficeInvoiceActions, summarizeInvoiceMetrics } from "@/lib/invoiceWorkflow";
import { getAccessToken } from "@/lib/supabase";

type InvoicesTabProps = {
  bookings: Booking[];
  isLoadingBookings: boolean;
  bookingError: string | null;
};

export default function InvoicesTab({ bookings, isLoadingBookings, bookingError }: InvoicesTabProps) {
  const [invoices, setInvoices] = useState<GreeterInvoice[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(true);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, { officeNotes: string; paymentReference: string }>>({});

  const completedJobsCount = useMemo(
    () => bookings.filter((booking) => (booking.driver_status || booking.status) === "completed").length,
    [bookings]
  );

  const metrics = useMemo(() => summarizeInvoiceMetrics(invoices), [invoices]);

  const loadInvoices = async () => {
    try {
      setIsLoadingInvoices(true);
      const token = await getAccessToken();
      const response = await fetch("/api/admin/invoices", {
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const payload = response.ok ? await response.json() : null;

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to load greeter invoices");
      }

      setInvoices(Array.isArray(payload) ? payload : []);
      setInvoiceError(null);
    } catch (error) {
      setInvoiceError(error instanceof Error ? error.message : "Failed to load greeter invoices");
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  useEffect(() => {
    void loadInvoices();
  }, []);

  const handleStatusChange = async (invoiceId: string, officeStatus: GreeterInvoiceStatus) => {
    try {
      setActiveInvoiceId(invoiceId);
      const token = await getAccessToken();
      const response = await fetch(`/api/admin/invoices/${invoiceId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          office_status: officeStatus,
          office_notes: reviewDrafts[invoiceId]?.officeNotes || null,
          payment_reference: reviewDrafts[invoiceId]?.paymentReference || null,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to update invoice");
      }

      setInvoices((current) => current.map((invoice) => (invoice.id === invoiceId ? payload : invoice)));
      toast.success(`Invoice ${getInvoiceStatusLabel(officeStatus).toLowerCase()}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update invoice");
    } finally {
      setActiveInvoiceId(null);
    }
  };

  const isBusy = isLoadingBookings || isLoadingInvoices;
  const errorMessage = bookingError || invoiceError;

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-2xl font-bold">Greeter Invoice Review</h2>
        <p className="text-sm text-slate-600">
          Office reviews submitted greeter invoices and marks them as processed. Completed jobs available for invoicing: {completedJobsCount}
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-sm text-slate-500">Total invoices</p>
          <p className="text-2xl font-bold text-slate-900">{metrics.total}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-sm text-slate-500">Pending review</p>
          <p className="text-2xl font-bold text-amber-600">{metrics.submitted + metrics.underReview}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-sm text-slate-500">Approved</p>
          <p className="text-2xl font-bold text-blue-600">{metrics.approved}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-sm text-slate-500">Paid</p>
          <p className="text-2xl font-bold text-emerald-600">{metrics.paid}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-sm text-slate-500">Outstanding value</p>
          <p className="text-2xl font-bold text-slate-900">£{metrics.outstandingAmount.toFixed(2)}</p>
        </div>
      </div>

      {isBusy ? (
        <p className="text-center">Loading invoice submissions...</p>
      ) : errorMessage ? (
        <p className="text-red-500 text-center">{errorMessage}</p>
      ) : invoices.length === 0 ? (
        <p className="text-center">No greeter invoices have been submitted yet.</p>
      ) : (
        <div className="bg-white p-4 rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-2 text-left">Booking</th>
                <th className="p-2 text-left">Greeter</th>
                <th className="p-2 text-left">Amount</th>
                <th className="p-2 text-left">Submitted</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Greeter notes</th>
                <th className="p-2 text-left">Office review</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => {
                const actions = getOfficeInvoiceActions(invoice.office_status);
                const draft = reviewDrafts[invoice.id] || {
                  officeNotes: invoice.office_notes || "",
                  paymentReference: invoice.payment_reference || "",
                };
                return (
                  <tr key={invoice.id} className="border-b align-top">
                    <td className="p-2 font-medium">{invoice.booking_ref || invoice.booking_id.slice(0, 8)}</td>
                    <td className="p-2">{invoice.greeter_email}</td>
                    <td className="p-2">£{Number(invoice.amount || 0).toFixed(2)}</td>
                    <td className="p-2">{new Date(invoice.submitted_at).toLocaleString()}</td>
                    <td className="p-2">{getInvoiceStatusLabel(invoice.office_status)}</td>
                    <td className="p-2">{invoice.notes || "—"}</td>
                    <td className="p-2 min-w-[260px]">
                      <div className="space-y-2">
                        <textarea
                          rows={2}
                          className="w-full rounded border border-slate-300 px-2 py-1"
                          placeholder="Office review notes"
                          value={draft.officeNotes}
                          onChange={(event) =>
                            setReviewDrafts((current) => ({
                              ...current,
                              [invoice.id]: {
                                ...draft,
                                officeNotes: event.target.value,
                              },
                            }))
                          }
                        />
                        <input
                          className="w-full rounded border border-slate-300 px-2 py-1"
                          placeholder="Payment reference"
                          value={draft.paymentReference}
                          onChange={(event) =>
                            setReviewDrafts((current) => ({
                              ...current,
                              [invoice.id]: {
                                ...draft,
                                paymentReference: event.target.value,
                              },
                            }))
                          }
                        />
                        {invoice.reviewed_at ? (
                          <p className="text-xs text-slate-500">
                            Reviewed {new Date(invoice.reviewed_at).toLocaleString()}
                          </p>
                        ) : null}
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-2">
                        {actions.length === 0 ? (
                          <div className="text-slate-500">
                            <span>No further action</span>
                            {invoice.payment_reference ? (
                              <p className="text-xs text-slate-500">Ref: {invoice.payment_reference}</p>
                            ) : null}
                          </div>
                        ) : (
                          actions.map((actionItem) => (
                            <Button
                              key={`${invoice.id}-${actionItem.action}`}
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(invoice.id, actionItem.action as GreeterInvoiceStatus)}
                              disabled={activeInvoiceId === invoice.id}
                            >
                              {activeInvoiceId === invoice.id ? "Updating..." : actionItem.label}
                            </Button>
                          ))
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}