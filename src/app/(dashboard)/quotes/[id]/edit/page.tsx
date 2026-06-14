"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { formatINR } from "@/lib/format";
import Link from "next/link";

interface QuoteItem {
  id?: string;
  lineNumber: number;
  productCode: string;
  description: string;
  quantity: number;
  unit: string;
  ratePerUnit: number;
  lineTotal: number;
  notes: string;
  imageUrl: string | null;
  drawingUrl: string | null;
}

const emptyItem: Omit<QuoteItem, "lineNumber"> = {
  productCode: "",
  description: "",
  quantity: 1,
  unit: "piece",
  ratePerUnit: 0,
  lineTotal: 0,
  notes: "",
  imageUrl: null,
  drawingUrl: null,
};

export default function QuoteEditPage() {
  const params = useParams();
  const router = useRouter();
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quoteNumber, setQuoteNumber] = useState("");
  const [currentVersion, setCurrentVersion] = useState(1);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  useEffect(() => {
    async function load() {
      const [bomRes, quoteRes] = await Promise.all([
        fetch(`/api/quotes/${params.id}/bom`),
        fetch(`/api/quotes/${params.id}/bom`).then(() =>
          fetch(`/api/quotes/${params.id}/bom`)
        ),
      ]);

      const quoteInfoRes = await fetch(`/api/quotes?_=${Date.now()}`);
      if (quoteInfoRes.ok) {
        const quotes = await quoteInfoRes.json();
        const thisQuote = quotes.find((q: { id: string }) => q.id === params.id);
        if (thisQuote) {
          setQuoteNumber(thisQuote.quoteNumber);
          setCurrentVersion(thisQuote.currentVersion);
        }
      }

      if (bomRes.ok) {
        const data = await bomRes.json();
        if (data.length > 0) {
          setItems(
            data.map((item: any) => ({
              id: item.id,
              lineNumber: item.lineNumber,
              productCode: item.productCode || "",
              description: item.description,
              quantity: Number(item.quantity),
              unit: item.unit,
              ratePerUnit: Number(item.ratePerUnit),
              lineTotal: Number(item.lineTotal),
              notes: item.notes || "",
              imageUrl: item.imageUrl,
              drawingUrl: item.drawingUrl,
            }))
          );
        } else {
          setItems([{ ...emptyItem, lineNumber: 1 }]);
        }
      }
      setLoading(false);
    }
    load();
  }, [params.id]);

  function updateItem(index: number, field: string, value: string | number | null) {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;

    if (field === "quantity" || field === "ratePerUnit") {
      newItems[index].lineTotal =
        Math.round(newItems[index].quantity * newItems[index].ratePerUnit * 100) / 100;
    }

    setItems(newItems);
  }

  function addItem() {
    setItems([...items, { ...emptyItem, lineNumber: items.length + 1 }]);
  }

  function removeItem(index: number) {
    const newItems = items
      .filter((_, i) => i !== index)
      .map((item, i) => ({ ...item, lineNumber: i + 1 }));
    setItems(newItems);
  }

  async function uploadFile(index: number, type: "image" | "drawing", file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/uploads", { method: "POST", body: formData });
    if (res.ok) {
      const { url } = await res.json();
      const field = type === "image" ? "imageUrl" : "drawingUrl";
      updateItem(index, field, url);
    }
  }

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/quotes/${params.id}/bom`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items,
        changeSummary: `Items updated — V${currentVersion + 1}`,
      }),
    });

    if (res.ok) {
      router.push(`/quotes/${params.id}`);
      router.refresh();
    }
    setSaving(false);
  }

  const grandTotal = items.reduce((sum, item) => sum + item.lineTotal, 0);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-surface rounded w-48" />
          <div className="h-96 bg-surface rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/quotes/${params.id}`}
            className="text-muted hover:text-foreground transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {quoteNumber ? `${quoteNumber}-V${currentVersion}` : "Edit Quote"}
            </h1>
            <p className="text-muted text-sm mt-0.5">
              Add products, quantities, and pricing
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">
            Total:{" "}
            <span className="font-bold text-foreground text-lg">
              {formatINR(grandTotal)}
            </span>
          </span>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary-light disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save Quote"}
          </button>
        </div>
      </div>

      {/* Table header */}
      <div className="hidden md:grid grid-cols-[60px_120px_1fr_100px_100px_130px_130px] gap-3 px-5 py-2 text-xs font-medium text-muted uppercase tracking-wide">
        <span>S.No</span>
        <span>SKU Code</span>
        <span>Description</span>
        <span>Qty</span>
        <span>Unit</span>
        <span>Price/Unit (₹)</span>
        <span className="text-right">Amount (₹)</span>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="bg-card border border-border rounded-xl p-5">
            {/* Main row */}
            <div className="grid grid-cols-1 md:grid-cols-[60px_120px_1fr_100px_100px_130px_130px] gap-3 items-start">
              <div>
                <label className="block text-xs font-medium text-muted mb-1 md:hidden">
                  S.No
                </label>
                <div className="w-full px-3 py-2 rounded-lg bg-surface text-sm text-center font-medium text-muted">
                  {item.lineNumber}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1 md:hidden">
                  SKU Code
                </label>
                <input
                  value={item.productCode}
                  onChange={(e) => updateItem(index, "productCode", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="SKU"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1 md:hidden">
                  Description
                </label>
                <input
                  value={item.description}
                  onChange={(e) => updateItem(index, "description", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="Product description"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1 md:hidden">
                  Qty
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.quantity}
                  onChange={(e) =>
                    updateItem(index, "quantity", parseFloat(e.target.value) || 0)
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1 md:hidden">
                  Unit
                </label>
                <select
                  value={item.unit}
                  onChange={(e) => updateItem(index, "unit", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  <option value="piece">Pcs</option>
                  <option value="sq_ft">Sq.ft</option>
                  <option value="set">Set</option>
                  <option value="running_ft">Rft</option>
                  <option value="kg">Kg</option>
                  <option value="litre">Ltr</option>
                  <option value="cu_ft">Cu.ft</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1 md:hidden">
                  Price/Unit
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.ratePerUnit}
                  onChange={(e) =>
                    updateItem(index, "ratePerUnit", parseFloat(e.target.value) || 0)
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-muted mb-1 md:hidden">
                    Amount
                  </label>
                  <div className="w-full px-3 py-2 rounded-lg bg-surface text-sm text-right font-medium text-foreground">
                    {formatINR(item.lineTotal)}
                  </div>
                </div>
                {items.length > 1 && (
                  <button
                    onClick={() => removeItem(index)}
                    className="mt-1 text-danger hover:text-danger/80 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Notes and attachments row */}
            <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-start">
              <div>
                <input
                  value={item.notes}
                  onChange={(e) => updateItem(index, "notes", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="Notes (optional)"
                />
              </div>
              <div className="flex items-center gap-2">
                {/* Image upload */}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  ref={(el) => { fileInputRefs.current[`img-${index}`] = el; }}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadFile(index, "image", file);
                  }}
                />
                <button
                  onClick={() => fileInputRefs.current[`img-${index}`]?.click()}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    item.imageUrl
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted hover:border-primary hover:text-primary"
                  }`}
                  title={item.imageUrl ? "Image attached" : "Attach image"}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                  </svg>
                  {item.imageUrl ? "Image" : "Image"}
                </button>

                {/* PDF upload */}
                <input
                  type="file"
                  accept="application/pdf"
                  ref={(el) => { fileInputRefs.current[`pdf-${index}`] = el; }}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadFile(index, "drawing", file);
                  }}
                />
                <button
                  onClick={() => fileInputRefs.current[`pdf-${index}`]?.click()}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    item.drawingUrl
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted hover:border-primary hover:text-primary"
                  }`}
                  title={item.drawingUrl ? "Drawing attached" : "Attach drawing (PDF)"}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  {item.drawingUrl ? "PDF" : "PDF"}
                </button>

                {(item.imageUrl || item.drawingUrl) && (
                  <button
                    onClick={() => {
                      updateItem(index, "imageUrl", null);
                      updateItem(index, "drawingUrl", null);
                    }}
                    className="text-xs text-danger hover:underline"
                  >
                    Clear
                  </button>
                )}
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

      {/* Sticky save bar */}
      <div className="sticky bottom-0 mt-6 -mx-4 px-4 py-4 bg-background/90 backdrop-blur-sm border-t border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="text-sm text-muted">
            {items.length} item{items.length !== 1 ? "s" : ""} &middot; Grand Total:{" "}
            <span className="font-bold text-foreground text-lg">{formatINR(grandTotal)}</span>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary-light disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : `Save as V${currentVersion + 1}`}
          </button>
        </div>
      </div>
    </div>
  );
}
