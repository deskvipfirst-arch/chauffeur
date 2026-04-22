import { describe, expect, it } from "vitest";
import {
  canGreeterSubmitInvoice,
  getInvoiceStatusLabel,
  getOfficeInvoiceActions,
  summarizeInvoiceMetrics,
} from "./invoiceWorkflow";

describe("invoice workflow helpers", () => {
  it("labels submitted invoices clearly", () => {
    expect(getInvoiceStatusLabel("submitted")).toBe("Submitted");
    expect(getInvoiceStatusLabel("under_review")).toBe("Under Review");
    expect(getInvoiceStatusLabel("queried")).toBe("Query Raised");
    expect(getInvoiceStatusLabel("unpaid")).toBe("Not Paid");
  });

  it("returns the correct office actions for submitted invoices", () => {
    expect(getOfficeInvoiceActions("submitted")).toEqual([
      { action: "under_review", label: "Start review" },
      { action: "queried", label: "Raise query" },
      { action: "approved", label: "Approve" },
      { action: "rejected", label: "Decline" },
    ]);
  });

  it("returns the correct office actions for queried invoices", () => {
    expect(getOfficeInvoiceActions("queried")).toEqual([
      { action: "under_review", label: "Resume review" },
      { action: "approved", label: "Approve" },
      { action: "rejected", label: "Decline" },
    ]);
  });

  it("returns the correct office actions for approved invoices", () => {
    expect(getOfficeInvoiceActions("approved")).toEqual([
      { action: "paid", label: "Mark paid" },
      { action: "unpaid", label: "Mark not paid" },
    ]);
  });

  it("does not expose actions for paid invoices", () => {
    expect(getOfficeInvoiceActions("paid")).toEqual([]);
  });

  it("only allows greeter submission after completion and before an invoice exists", () => {
    expect(canGreeterSubmitInvoice("completed", false)).toBe(true);
    expect(canGreeterSubmitInvoice("accepted", false)).toBe(false);
    expect(canGreeterSubmitInvoice("completed", true)).toBe(false);
  });

  it("summarizes invoice totals for office reporting", () => {
    expect(
      summarizeInvoiceMetrics([
        { office_status: "submitted", amount: 100 },
        { office_status: "queried", amount: 150 },
        { office_status: "approved", amount: 200 },
        { office_status: "paid", amount: 300 },
        { office_status: "unpaid", amount: 50 },
      ])
    ).toEqual({
      total: 5,
      submitted: 1,
      underReview: 0,
      queried: 1,
      approved: 1,
      rejected: 0,
      paid: 1,
      unpaid: 1,
      totalAmount: 800,
      outstandingAmount: 500,
    });
  });
});
