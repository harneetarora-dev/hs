"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  orderId: string;
  orderStatus: string;
  userRole: string;
  userId: string;
  supervisorId: string | null;
  merchantId: string;
  contractors: { id: string; name: string }[];
  locations: { id: string; name: string }[];
  hasInvoice: boolean;
}

export default function OrderActions({ orderId, orderStatus, userRole, userId, supervisorId, merchantId, contractors, locations, hasInvoice }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showDelay, setShowDelay] = useState(false);
  const [assignForm, setAssignForm] = useState({ contractorId: "", locationId: "", expectedEndDate: "" });
  const [delayForm, setDelayForm] = useState({ reason: "", originalDate: "", revisedDate: "" });

  const isSupervisor = userRole === "supervisor" && supervisorId === userId;
  const isOwner = userRole === "owner";
  const isMerchant = userRole === "merchant" && merchantId === userId;
  const canManageProduction = isSupervisor || isOwner;
  const canUpdateStatus = canManageProduction && orderStatus !== "delivered" && orderStatus !== "closed" && orderStatus !== "cancelled";

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch(`/api/orders/${orderId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(assignForm),
    });
    if (res.ok) {
      setShowAssign(false);
      router.refresh();
    } else {
      const err = await res.json();
      alert(err.error || "Failed to assign");
    }
    setLoading(false);
  }

  async function handleStatusUpdate(newStatus: string) {
    setLoading(true);
    const notes = prompt("Notes (optional):");
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, notes }),
    });
    if (res.ok) router.refresh();
    else alert("Failed to update status");
    setLoading(false);
  }

  async function handleDelay(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch(`/api/orders/${orderId}/delay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(delayForm),
    });
    if (res.ok) {
      setShowDelay(false);
      router.refresh();
    } else {
      const err = await res.json();
      alert(err.error || "Failed to log delay");
    }
    setLoading(false);
  }

  const nextStatus: Record<string, string> = {
    confirmed: "in_production",
    in_production: "quality_check",
    quality_check: "dispatched",
    dispatched: "delivered",
  };

  if (!canManageProduction && !isMerchant) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <h2 className="font-semibold text-foreground">Actions</h2>

      <div className="flex flex-wrap gap-2">
        {canManageProduction && (
          <button
            onClick={() => setShowAssign(!showAssign)}
            disabled={loading}
            className="bg-[#E0F0F8] text-[#2980B9] px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[#D0E8F5] transition-colors disabled:opacity-50"
          >
            Assign Contractor
          </button>
        )}

        {canUpdateStatus && nextStatus[orderStatus] && (
          <button
            onClick={() => handleStatusUpdate(nextStatus[orderStatus])}
            disabled={loading}
            className="bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Move to {nextStatus[orderStatus].replace("_", " ")}
          </button>
        )}

        {isSupervisor && orderStatus === "in_production" && (
          <button
            onClick={() => setShowDelay(!showDelay)}
            disabled={loading}
            className="bg-warning-light text-warning px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-warning-light/80 transition-colors disabled:opacity-50"
          >
            Log Delay
          </button>
        )}

        {isMerchant && !hasInvoice && (orderStatus === "delivered" || orderStatus === "dispatched") && (
          <button
            onClick={() => router.push(`/orders/${orderId}/invoice`)}
            className="bg-success text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-success/90 transition-colors"
          >
            Generate Invoice
          </button>
        )}

        {(isMerchant || isOwner) && hasInvoice && (
          <button
            onClick={() => router.push(`/orders/${orderId}/invoice`)}
            className="bg-surface text-primary px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-surface/80 transition-colors border border-border"
          >
            View Invoice
          </button>
        )}
      </div>

      {showAssign && (
        <form onSubmit={handleAssign} className="border-t border-border pt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Contractor *</label>
              <select
                required
                value={assignForm.contractorId}
                onChange={(e) => setAssignForm({ ...assignForm, contractorId: e.target.value })}
                className="w-full px-2 py-1.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select...</option>
                {contractors.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Location</label>
              <select
                value={assignForm.locationId}
                onChange={(e) => setAssignForm({ ...assignForm, locationId: e.target.value })}
                className="w-full px-2 py-1.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">None</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Expected End Date</label>
            <input
              type="date"
              value={assignForm.expectedEndDate}
              onChange={(e) => setAssignForm({ ...assignForm, expectedEndDate: e.target.value })}
              className="px-2 py-1.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-primary text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Assigning..." : "Assign"}
          </button>
        </form>
      )}

      {showDelay && (
        <form onSubmit={handleDelay} className="border-t border-border pt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Reason *</label>
            <input
              type="text"
              required
              value={delayForm.reason}
              onChange={(e) => setDelayForm({ ...delayForm, reason: e.target.value })}
              className="w-full px-2 py-1.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Material shortage, labor issue..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Original Date *</label>
              <input
                type="date"
                required
                value={delayForm.originalDate}
                onChange={(e) => setDelayForm({ ...delayForm, originalDate: e.target.value })}
                className="w-full px-2 py-1.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Revised Date *</label>
              <input
                type="date"
                required
                value={delayForm.revisedDate}
                onChange={(e) => setDelayForm({ ...delayForm, revisedDate: e.target.value })}
                className="w-full px-2 py-1.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-warning text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-warning/90 disabled:opacity-50"
          >
            {loading ? "Logging..." : "Log Delay"}
          </button>
        </form>
      )}
    </div>
  );
}
