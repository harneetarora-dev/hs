"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewLeadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const data = {
      clientName: formData.get("clientName"),
      clientPhone: formData.get("clientPhone"),
      clientEmail: formData.get("clientEmail"),
      source: formData.get("source"),
      productInterest: formData.get("productInterest"),
      notes: formData.get("notes"),
    };

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create lead");
      }

      router.push("/leads");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">New Lead</h1>
        <p className="text-muted mt-1">Log a new client enquiry</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="clientName" className="block text-sm font-medium text-foreground mb-1.5">
                Client Name *
              </label>
              <input
                id="clientName"
                name="clientName"
                required
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                placeholder="Full name"
              />
            </div>
            <div>
              <label htmlFor="clientPhone" className="block text-sm font-medium text-foreground mb-1.5">
                Phone
              </label>
              <input
                id="clientPhone"
                name="clientPhone"
                type="tel"
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="clientEmail" className="block text-sm font-medium text-foreground mb-1.5">
                Email
              </label>
              <input
                id="clientEmail"
                name="clientEmail"
                type="email"
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                placeholder="client@example.com"
              />
            </div>
            <div>
              <label htmlFor="source" className="block text-sm font-medium text-foreground mb-1.5">
                Source *
              </label>
              <select
                id="source"
                name="source"
                required
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              >
                <option value="phone">Phone</option>
                <option value="email">Email</option>
                <option value="walk_in">Walk-in</option>
                <option value="architect_referral">Architect Referral</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="productInterest" className="block text-sm font-medium text-foreground mb-1.5">
              Product Interest
            </label>
            <input
              id="productInterest"
              name="productInterest"
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              placeholder="e.g., Living room sofa set, Dining table"
            />
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-foreground mb-1.5">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
              placeholder="Any additional details about the enquiry..."
            />
          </div>

          {error && (
            <div className="text-sm text-danger bg-danger-light px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Creating..." : "Create Lead"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-5 py-2.5 border border-border text-foreground rounded-lg font-medium text-sm hover:bg-surface transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
