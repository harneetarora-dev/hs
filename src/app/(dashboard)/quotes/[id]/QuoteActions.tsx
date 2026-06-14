"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

interface QuoteActionsProps {
  quoteId: string;
  quoteStatus: string;
  userRole: string;
  hasOrder: boolean;
  orderId?: string;
  orderNumber?: string;
}

export default function QuoteActions({
  quoteId,
  quoteStatus,
  userRole,
  hasOrder,
  orderId,
  orderNumber,
}: QuoteActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState("");

  const canEdit = ["owner", "merchant"].includes(userRole);

  async function updateStatus(status: string) {
    setLoading(status);
    const res = await fetch(`/api/quotes/${quoteId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      router.refresh();
    }
    setLoading("");
  }

  async function convertToOrder() {
    if (!confirm("Convert this quote to an order? This action cannot be undone.")) return;
    setLoading("convert");
    const res = await fetch(`/api/quotes/${quoteId}/convert`, { method: "POST" });
    if (res.ok) {
      const order = await res.json();
      router.push(`/orders/${order.id}`);
    } else {
      const err = await res.json();
      alert(err.error || "Failed to convert");
    }
    setLoading("");
  }

  if (!canEdit) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-3">
      <h2 className="font-semibold text-foreground mb-2">Actions</h2>

      {hasOrder && orderId && (
        <Link
          href={`/orders/${orderId}`}
          className="block w-full text-center px-4 py-2.5 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary-light transition-colors"
        >
          View Order {orderNumber}
        </Link>
      )}

      {!hasOrder && (
        <>
          {quoteStatus === "draft" && (
            <button
              onClick={() => updateStatus("sent")}
              disabled={loading === "sent"}
              className="w-full px-4 py-2.5 bg-[#2980B9] text-white rounded-lg font-medium text-sm hover:bg-[#2471A3] disabled:opacity-50 transition-colors"
            >
              {loading === "sent" ? "Sending..." : "Mark as Sent"}
            </button>
          )}

          {quoteStatus === "sent" && (
            <div className="space-y-2">
              <button
                onClick={() => updateStatus("approved")}
                disabled={loading === "approved"}
                className="w-full px-4 py-2.5 bg-green-700 text-white rounded-lg font-medium text-sm hover:bg-green-600 disabled:opacity-50 transition-colors"
              >
                {loading === "approved" ? "Approving..." : "Mark as Approved"}
              </button>
              <button
                onClick={() => updateStatus("revision_requested")}
                disabled={loading === "revision_requested"}
                className="w-full px-4 py-2.5 bg-warning text-white rounded-lg font-medium text-sm hover:bg-warning/90 disabled:opacity-50 transition-colors"
              >
                {loading === "revision_requested" ? "..." : "Request Revision"}
              </button>
              <button
                onClick={() => updateStatus("lost")}
                disabled={loading === "lost"}
                className="w-full px-4 py-2.5 bg-danger text-white rounded-lg font-medium text-sm hover:bg-danger/90 disabled:opacity-50 transition-colors"
              >
                {loading === "lost" ? "..." : "Mark as Lost"}
              </button>
            </div>
          )}

          {quoteStatus === "revision_requested" && (
            <button
              onClick={() => updateStatus("sent")}
              disabled={loading === "sent"}
              className="w-full px-4 py-2.5 bg-[#2980B9] text-white rounded-lg font-medium text-sm hover:bg-[#2471A3] disabled:opacity-50 transition-colors"
            >
              {loading === "sent" ? "Sending..." : "Re-send Quote"}
            </button>
          )}

          {quoteStatus === "approved" && (
            <button
              onClick={convertToOrder}
              disabled={loading === "convert"}
              className="w-full px-4 py-2.5 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary-light disabled:opacity-50 transition-colors"
            >
              {loading === "convert" ? "Converting..." : "Convert to Order"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
