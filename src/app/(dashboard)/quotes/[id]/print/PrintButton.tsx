"use client";

export default function PrintButton() {
  return (
    <div className="print:hidden mb-6 flex items-center gap-3">
      <button
        onClick={() => window.print()}
        className="px-5 py-2.5 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary-light transition-colors"
      >
        Print / Save as PDF
      </button>
      <button
        onClick={() => window.history.back()}
        className="px-4 py-2.5 bg-surface text-foreground border border-border rounded-lg font-medium text-sm hover:bg-surface-hover transition-colors"
      >
        Back
      </button>
    </div>
  );
}
