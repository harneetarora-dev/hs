"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  invoiceId: string;
  invoiceStatus: string;
  totalDue: number;
  totalPaid: number;
  userRole: string;
  orderId?: string;
  canCreate?: boolean;
}

export default function InvoiceActions({ invoiceId, invoiceStatus, totalDue, totalPaid, userRole, orderId, canCreate }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentMethod: "bank_transfer",
    referenceNumber: "",
    notes: "",
  });
  const [invoiceForm, setInvoiceForm] = useState({
    gstRate: "18",
    discount: "0",
    paymentDueDate: "",
  });

  const remaining = totalDue - totalPaid;
  const canRecordPayment = (userRole === "merchant" || userRole === "owner") && invoiceStatus !== "paid" && remaining > 0;

  async function handleCreateInvoice(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch(`/api/orders/${orderId}/invoice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gstRate: Number(invoiceForm.gstRate),
        discount: Number(invoiceForm.discount),
        paymentDueDate: invoiceForm.paymentDueDate || null,
      }),
    });
    if (res.ok) router.refresh();
    else {
      const err = await res.json();
      alert(err.error || "Failed to create invoice");
    }
    setLoading(false);
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch(`/api/invoices/${invoiceId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(paymentForm.amount),
        paymentMethod: paymentForm.paymentMethod,
        referenceNumber: paymentForm.referenceNumber || null,
        notes: paymentForm.notes || null,
      }),
    });
    if (res.ok) {
      setShowPaymentForm(false);
      setPaymentForm({ amount: "", paymentMethod: "bank_transfer", referenceNumber: "", notes: "" });
      router.refresh();
    } else {
      const err = await res.json();
      alert(err.error || "Failed to record payment");
    }
    setLoading(false);
  }

  if (canCreate) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-foreground mb-4">Generate Invoice</h2>
        <form onSubmit={handleCreateInvoice} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">GST Rate (%)</label>
              <input
                type="number"
                value={invoiceForm.gstRate}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, gstRate: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Discount (₹)</label>
              <input
                type="number"
                value={invoiceForm.discount}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, discount: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Payment Due Date</label>
              <input
                type="date"
                value={invoiceForm.paymentDueDate}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, paymentDueDate: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate Invoice"}
          </button>
        </form>
      </div>
    );
  }

  if (!canRecordPayment) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      {!showPaymentForm ? (
        <button
          onClick={() => setShowPaymentForm(true)}
          className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Record Payment
        </button>
      ) : (
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <h3 className="font-semibold text-foreground">Record Payment</h3>
          <p className="text-sm text-muted">Remaining balance: ₹{remaining.toLocaleString("en-IN")}</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Amount (₹) *</label>
              <input
                type="number"
                required
                max={remaining}
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Enter amount"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Method</label>
              <select
                value={paymentForm.paymentMethod}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="upi">UPI</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="card">Card</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Reference #</label>
              <input
                type="text"
                value={paymentForm.referenceNumber}
                onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Transaction ID / Cheque #"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Notes</label>
              <input
                type="text"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Optional notes"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Saving..." : "Record Payment"}
            </button>
            <button
              type="button"
              onClick={() => setShowPaymentForm(false)}
              className="px-5 py-2 rounded-lg text-sm font-medium border border-border text-muted hover:bg-surface transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
