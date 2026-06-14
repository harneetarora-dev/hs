"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function NewCustomerPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    companyName: "",
    phone: "",
    email: "",
    gstn: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    notes: "",
  });

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      const customer = await res.json();
      router.push(`/customers/${customer.id}`);
    }
    setSaving(false);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/customers" className="text-muted hover:text-foreground transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-foreground">New Customer</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Name *</label>
            <input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="Customer name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Company</label>
            <input
              value={form.companyName}
              onChange={(e) => update("companyName", e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="Company name"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Phone</label>
            <input
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="+91 ..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="customer@example.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">GSTN</label>
          <input
            value={form.gstn}
            onChange={(e) => update("gstn", e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            placeholder="GST number"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Address</label>
          <input
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            placeholder="Street address"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">City</label>
            <input
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="City"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">State</label>
            <input
              value={form.state}
              onChange={(e) => update("state", e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="State"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Pincode</label>
            <input
              value={form.pincode}
              onChange={(e) => update("pincode", e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="Pincode"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            rows={3}
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            placeholder="Additional notes..."
          />
        </div>

        <button
          type="submit"
          disabled={saving || !form.name}
          className="w-full py-2.5 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary-light disabled:opacity-50 transition-colors"
        >
          {saving ? "Creating..." : "Create Customer"}
        </button>
      </form>
    </div>
  );
}
