"use client";

import { useEffect, useState } from "react";

interface Location {
  id: string;
  name: string;
  address: string | null;
  isActive: boolean;
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchLocations();
  }, []);

  async function fetchLocations() {
    const res = await fetch("/api/locations");
    if (res.ok) {
      setLocations(await res.json());
    }
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          address: formData.get("address"),
        }),
      });
      if (!res.ok) throw new Error("Failed to create location");
      setShowForm(false);
      fetchLocations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setFormLoading(false);
    }
  }

  if (loading) {
    return <div className="max-w-3xl mx-auto"><div className="animate-pulse h-64 bg-surface rounded-xl" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Locations</h1>
          <p className="text-muted mt-1">Production workshop locations</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary-light transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Location
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Name *</label>
              <input name="name" required className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors" placeholder="Workshop D — Location" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Address</label>
              <input name="address" className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors" placeholder="Full address" />
            </div>
            {error && <div className="text-sm text-danger bg-danger-light px-3 py-2 rounded-lg">{error}</div>}
            <div className="flex gap-3">
              <button type="submit" disabled={formLoading} className="px-5 py-2.5 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary-light disabled:opacity-50 transition-colors">
                {formLoading ? "Creating..." : "Create"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-surface transition-colors">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {locations.length === 0 ? (
          <div className="p-8 text-center text-muted">No locations yet</div>
        ) : (
          <div className="divide-y divide-border">
            {locations.map((loc) => (
              <div key={loc.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground text-sm">{loc.name}</p>
                  {loc.address && <p className="text-xs text-muted mt-0.5">{loc.address}</p>}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${loc.isActive ? "bg-success-light text-success" : "bg-danger-light text-danger"}`}>
                  {loc.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
