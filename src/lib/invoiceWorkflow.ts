export type InvoiceStatus = "submitted" | "under_review" | "queried" | "approved" | "rejected" | "paid" | "unpaid";

export function getInvoiceStatusLabel(status: string) {
  const labels: Record<InvoiceStatus, string> = {
    submitted: "Submitted",
    under_review: "Under Review",
    queried: "Query Raised",
    approved: "Approved",
    rejected: "Declined",
    paid: "Paid",
    unpaid: "Not Paid",
  };

  return labels[status as InvoiceStatus] || "Submitted";
}

export function getOfficeInvoiceActions(status: string) {
  switch (status) {
    case "submitted":
      return [
        { action: "under_review", label: "Start review" },
        { action: "queried", label: "Raise query" },
        { action: "approved", label: "Approve" },
        { action: "rejected", label: "Decline" },
      ];
    case "under_review":
      return [
        { action: "queried", label: "Raise query" },
        { action: "approved", label: "Approve" },
        { action: "rejected", label: "Decline" },
      ];
    case "queried":
      return [
        { action: "under_review", label: "Resume review" },
        { action: "approved", label: "Approve" },
        { action: "rejected", label: "Decline" },
      ];
    case "approved":
      return [
        { action: "paid", label: "Mark paid" },
        { action: "unpaid", label: "Mark not paid" },
      ];
    default:
      return [];
  }
}

export function canGreeterSubmitInvoice(status: string, hasInvoice: boolean) {
  return status === "completed" && !hasInvoice;
}

export function summarizeInvoiceMetrics(invoices: Array<{ office_status?: string; amount?: number }>) {
  return invoices.reduce(
    (summary, invoice) => {
      const status = String(invoice.office_status || "submitted");
      const amount = Number(invoice.amount || 0);

      summary.total += 1;
      summary.totalAmount += amount;

      if (status === "submitted") summary.submitted += 1;
      if (status === "under_review") summary.underReview += 1;
      if (status === "queried") summary.queried += 1;
      if (status === "approved") summary.approved += 1;
      if (status === "rejected") summary.rejected += 1;
      if (status === "paid") summary.paid += 1;
      if (status === "unpaid") summary.unpaid += 1;

      if (["submitted", "under_review", "queried", "approved", "unpaid"].includes(status)) {
        summary.outstandingAmount += amount;
      }

      return summary;
    },
    {
      total: 0,
      submitted: 0,
      underReview: 0,
      queried: 0,
      approved: 0,
      rejected: 0,
      paid: 0,
      unpaid: 0,
      totalAmount: 0,
      outstandingAmount: 0,
    }
  );
}
