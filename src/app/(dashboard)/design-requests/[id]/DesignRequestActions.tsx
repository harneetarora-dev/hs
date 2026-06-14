"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  requestId: string;
  status: string;
  userRole: string;
  userId: string;
  assignedToId: string | null;
  designers: { id: string; name: string }[];
}

export default function DesignRequestActions({ requestId, status, userRole, userId, assignedToId, designers }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const isDesigner = userRole === "designer";
  const isAssignedDesigner = isDesigner && assignedToId === userId;
  const canAssign = userRole === "owner" || userRole === "supervisor";
  const canComplete = isAssignedDesigner && status === "in_progress";
  const canRequestRevision = (userRole === "merchant" || userRole === "supervisor") && status === "completed";

  async function handleAssign(designerId: string) {
    setLoading(true);
    const res = await fetch(`/api/design-requests/${requestId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedToId: designerId }),
    });
    if (res.ok) router.refresh();
    else alert("Failed to assign");
    setLoading(false);
  }

  async function handleStatusChange(newStatus: string) {
    setLoading(true);
    const res = await fetch(`/api/design-requests/${requestId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) router.refresh();
    else alert("Failed to update");
    setLoading(false);
  }

  async function handleComplete() {
    const notes = prompt("Completion notes (optional):");
    setLoading(true);
    const res = await fetch(`/api/design-requests/${requestId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revisionNotes: notes || "" }),
    });
    if (res.ok) router.refresh();
    else alert("Failed to complete");
    setLoading(false);
  }

  async function handleRevision() {
    const notes = prompt("What needs to be revised?");
    if (!notes) return;
    setLoading(true);
    const res = await fetch(`/api/design-requests/${requestId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "revision_requested", revisionNotes: notes }),
    });
    if (res.ok) router.refresh();
    else alert("Failed to request revision");
    setLoading(false);
  }

  if (status === "completed" && !canRequestRevision) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h2 className="font-semibold text-foreground mb-4">Actions</h2>
      <div className="flex flex-wrap gap-3">
        {canAssign && (status === "pending" || status === "revision_requested") && (
          <select
            onChange={(e) => e.target.value && handleAssign(e.target.value)}
            disabled={loading}
            className="px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Assign to designer...</option>
            {designers.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        )}

        {isAssignedDesigner && status === "pending" && (
          <button
            onClick={() => handleStatusChange("in_progress")}
            disabled={loading}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Start Working
          </button>
        )}

        {canComplete && (
          <button
            onClick={handleComplete}
            disabled={loading}
            className="bg-success text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-success/90 transition-colors disabled:opacity-50"
          >
            Mark Complete
          </button>
        )}

        {canRequestRevision && (
          <button
            onClick={handleRevision}
            disabled={loading}
            className="bg-warning text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-warning/90 transition-colors disabled:opacity-50"
          >
            Request Revision
          </button>
        )}
      </div>
    </div>
  );
}
