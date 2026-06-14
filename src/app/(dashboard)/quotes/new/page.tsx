"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { DEFAULT_TERMS } from "@/lib/company";

function NewQuoteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get("leadId");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const data = {
      leadId,
      taxRate: Number(formData.get("taxRate")) || 18,
      notesToClient: formData.get("notesToClient"),
      internalNotes: formData.get("internalNotes"),
    };

    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create quote");
      }

      const quote = await res.json();
      router.push(`/quotes/${quote.id}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!leadId) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <p className="text-muted">No lead selected. Go to a lead and click "Create Quote".</p>
          <button onClick={() => router.push("/leads")} className="text-primary text-sm font-medium hover:underline mt-2">
            Go to Leads
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">New Quote</h1>
        <p className="text-muted mt-1">Create a quotation for this lead</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="taxRate" className="block text-sm font-medium text-foreground mb-1.5">
              GST Rate (%)
            </label>
            <input
              id="taxRate"
              name="taxRate"
              type="number"
              defaultValue={18}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label htmlFor="notesToClient" className="block text-sm font-medium text-foreground mb-1.5">
              Notes to Client
            </label>
            <textarea
              id="notesToClient"
              name="notesToClient"
              rows={6}
              defaultValue={DEFAULT_TERMS}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
              placeholder="Terms, conditions, or notes visible to the client..."
            />
          </div>

          <div>
            <label htmlFor="internalNotes" className="block text-sm font-medium text-foreground mb-1.5">
              Internal Notes
            </label>
            <textarea
              id="internalNotes"
              name="internalNotes"
              rows={2}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
              placeholder="Internal notes (not visible to client)..."
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
              {loading ? "Creating..." : "Create Quote & Add BOM"}
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

export default function NewQuotePage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto p-12 text-center text-muted">Loading...</div>}>
      <NewQuoteForm />
    </Suspense>
  );
}
