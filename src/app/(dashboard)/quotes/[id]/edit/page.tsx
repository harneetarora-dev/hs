"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatINR } from "@/lib/format";

interface BomItem {
  id?: string;
  lineNumber: number;
  description: string;
  materialCategory: string;
  materialName: string;
  materialGrade: string;
  unit: string;
  quantity: number;
  ratePerUnit: number;
  materialCost: number;
  laborCost: number;
  finishingCost: number;
  hardwareCost: number;
  transportCost: number;
  marginPercent: number;
  lineTotal: number;
  lengthValue: number | null;
  lengthUnit: string;
  widthValue: number | null;
  widthUnit: string;
  heightValue: number | null;
  heightUnit: string;
}

const emptyItem: Omit<BomItem, "lineNumber"> = {
  description: "",
  materialCategory: "wood",
  materialName: "",
  materialGrade: "",
  unit: "piece",
  quantity: 1,
  ratePerUnit: 0,
  materialCost: 0,
  laborCost: 0,
  finishingCost: 0,
  hardwareCost: 0,
  transportCost: 0,
  marginPercent: 0,
  lineTotal: 0,
  lengthValue: null,
  lengthUnit: "ft",
  widthValue: null,
  widthUnit: "ft",
  heightValue: null,
  heightUnit: "ft",
};

export default function QuoteEditPage() {
  const params = useParams();
  const router = useRouter();
  const [items, setItems] = useState<BomItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/quotes/${params.id}/bom`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.length > 0 ? data : [{ ...emptyItem, lineNumber: 1 }]);
      }
      setLoading(false);
    }
    load();
  }, [params.id]);

  function calculateLineTotal(item: BomItem): number {
    const matCost = item.quantity * item.ratePerUnit;
    const subtotal = matCost + item.laborCost + item.finishingCost + item.hardwareCost + item.transportCost;
    const withMargin = subtotal * (1 + item.marginPercent / 100);
    return Math.round(withMargin * 100) / 100;
  }

  function updateItem(index: number, field: string, value: string | number | null) {
    const newItems = [...items];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (newItems[index] as any)[field] = value;

    if (["quantity", "ratePerUnit", "laborCost", "finishingCost", "hardwareCost", "transportCost", "marginPercent"].includes(field)) {
      newItems[index].materialCost = newItems[index].quantity * newItems[index].ratePerUnit;
      newItems[index].lineTotal = calculateLineTotal(newItems[index]);
    }

    setItems(newItems);
  }

  function addItem() {
    setItems([...items, { ...emptyItem, lineNumber: items.length + 1 }]);
  }

  function removeItem(index: number) {
    const newItems = items.filter((_, i) => i !== index).map((item, i) => ({ ...item, lineNumber: i + 1 }));
    setItems(newItems);
  }

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/quotes/${params.id}/bom`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });

    if (res.ok) {
      router.push(`/quotes/${params.id}`);
      router.refresh();
    }
    setSaving(false);
  }

  const grandSubtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-surface rounded w-48" />
          <div className="h-96 bg-surface rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Edit BOM</h1>
          <p className="text-muted mt-1">Add materials, dimensions, and pricing</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">
            Total: <span className="font-bold text-foreground">{formatINR(grandSubtotal)}</span>
          </span>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary-light disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save BOM"}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={index} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-muted">Line {item.lineNumber}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-primary">{formatINR(item.lineTotal)}</span>
                {items.length > 1 && (
                  <button onClick={() => removeItem(index)} className="text-danger hover:text-danger/80 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-muted mb-1">Description *</label>
                <input
                  value={item.description}
                  onChange={(e) => updateItem(index, "description", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="e.g., Dining table top - Teak"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Category</label>
                <select
                  value={item.materialCategory}
                  onChange={(e) => updateItem(index, "materialCategory", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  <option value="wood">Wood</option>
                  <option value="hardware">Hardware</option>
                  <option value="fabric">Fabric</option>
                  <option value="glass">Glass</option>
                  <option value="metal">Metal</option>
                  <option value="finish">Finish</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Material Name</label>
                <input
                  value={item.materialName}
                  onChange={(e) => updateItem(index, "materialName", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="e.g., Teak"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Quantity</label>
                <input
                  type="number"
                  step="0.01"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Unit</label>
                <select
                  value={item.unit}
                  onChange={(e) => updateItem(index, "unit", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  <option value="sq_ft">sq.ft</option>
                  <option value="cu_ft">cu.ft</option>
                  <option value="running_ft">running ft</option>
                  <option value="piece">piece</option>
                  <option value="kg">kg</option>
                  <option value="litre">litre</option>
                  <option value="set">set</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Rate/Unit (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={item.ratePerUnit}
                  onChange={(e) => updateItem(index, "ratePerUnit", parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Labor (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={item.laborCost}
                  onChange={(e) => updateItem(index, "laborCost", parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Finishing (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={item.finishingCost}
                  onChange={(e) => updateItem(index, "finishingCost", parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Margin %</label>
                <input
                  type="number"
                  step="0.1"
                  value={item.marginPercent}
                  onChange={(e) => updateItem(index, "marginPercent", parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            </div>

            {/* Dimensions Row */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Length</label>
                <input
                  type="number"
                  step="0.01"
                  value={item.lengthValue ?? ""}
                  onChange={(e) => updateItem(index, "lengthValue", e.target.value ? parseFloat(e.target.value) : null)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="L"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Width</label>
                <input
                  type="number"
                  step="0.01"
                  value={item.widthValue ?? ""}
                  onChange={(e) => updateItem(index, "widthValue", e.target.value ? parseFloat(e.target.value) : null)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="W"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Height</label>
                <input
                  type="number"
                  step="0.01"
                  value={item.heightValue ?? ""}
                  onChange={(e) => updateItem(index, "heightValue", e.target.value ? parseFloat(e.target.value) : null)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="H"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Dim. Unit</label>
                <select
                  value={item.lengthUnit}
                  onChange={(e) => {
                    updateItem(index, "lengthUnit", e.target.value);
                    updateItem(index, "widthUnit", e.target.value);
                    updateItem(index, "heightUnit", e.target.value);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  <option value="mm">mm</option>
                  <option value="cm">cm</option>
                  <option value="inch">inches</option>
                  <option value="ft">feet</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addItem}
        className="mt-4 w-full py-3 border-2 border-dashed border-border rounded-xl text-sm font-medium text-muted hover:border-primary hover:text-primary transition-colors"
      >
        + Add Line Item
      </button>
    </div>
  );
}
