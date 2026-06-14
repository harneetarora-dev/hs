import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { formatDate, formatINR, statusLabel } from "@/lib/format";

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      lead: { select: { clientName: true, clientPhone: true, id: true } },
      merchant: { select: { name: true } },
      bomItems: { orderBy: { lineNumber: "asc" } },
      versions: { orderBy: { versionNumber: "desc" } },
    },
  });

  if (!quote) notFound();

  if (session.user.role === "merchant" && quote.merchantId !== session.user.id) {
    redirect("/quotes");
  }

  const subtotal = quote.bomItems.reduce((sum, item) => sum + Number(item.lineTotal), 0);
  const gstAmount = subtotal * (Number(quote.taxRate) / 100);
  let discount = 0;
  if (quote.discountType === "percentage") {
    discount = subtotal * (Number(quote.discountValue) / 100);
  } else if (quote.discountType === "fixed") {
    discount = Number(quote.discountValue);
  }
  const grandTotal = subtotal + gstAmount - discount;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/quotes" className="text-muted hover:text-foreground transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{quote.quoteNumber}</h1>
          <p className="text-muted">{quote.lead.clientName} &middot; v{quote.currentVersion}</p>
        </div>
        <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${getQuoteStatusStyle(quote.status)}`}>
          {statusLabel(quote.status)}
        </span>
        {session.user.role === "merchant" && quote.status === "draft" && (
          <Link
            href={`/quotes/${quote.id}/edit`}
            className="px-4 py-2 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary-light transition-colors"
          >
            Edit BOM
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* BOM Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Bill of Materials</h2>
            </div>
            {quote.bomItems.length === 0 ? (
              <div className="p-8 text-center text-muted">
                <p>No items yet</p>
                {session.user.role === "merchant" && (
                  <Link href={`/quotes/${quote.id}/edit`} className="text-primary text-sm font-medium hover:underline mt-2 inline-block">
                    Add items to this quote
                  </Link>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface text-left text-muted">
                      <th className="px-4 py-2.5 font-medium">#</th>
                      <th className="px-4 py-2.5 font-medium">Description</th>
                      <th className="px-4 py-2.5 font-medium">Material</th>
                      <th className="px-4 py-2.5 font-medium">Qty</th>
                      <th className="px-4 py-2.5 font-medium">Dimensions</th>
                      <th className="px-4 py-2.5 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {quote.bomItems.map((item) => (
                      <tr key={item.id} className="hover:bg-card-hover">
                        <td className="px-4 py-3 text-muted">{item.lineNumber}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{item.description}</td>
                        <td className="px-4 py-3 text-muted">
                          {item.materialName || statusLabel(item.materialCategory)}
                          {item.materialGrade && <span className="text-xs ml-1">({item.materialGrade})</span>}
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {Number(item.quantity)} {item.unit.replace(/_/g, " ")}
                        </td>
                        <td className="px-4 py-3 text-muted text-xs">
                          {item.lengthValue && `${item.lengthValue}${item.lengthUnit}`}
                          {item.widthValue && ` × ${item.widthValue}${item.widthUnit}`}
                          {item.heightValue && ` × ${item.heightValue}${item.heightUnit}`}
                          {!item.lengthValue && "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">{formatINR(Number(item.lineTotal))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Version History */}
          {quote.versions.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="font-semibold text-foreground">Version History</h2>
              </div>
              <div className="divide-y divide-border">
                {quote.versions.map((version) => (
                  <div key={version.id} className="px-6 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">v{version.versionNumber}</span>
                      <span className="text-xs text-muted">{formatDate(version.createdAt)}</span>
                    </div>
                    {version.changeSummary && (
                      <p className="text-xs text-muted mt-1">{version.changeSummary}</p>
                    )}
                    {version.changeReason && (
                      <p className="text-xs text-accent mt-0.5">Reason: {version.changeReason}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Pricing Summary */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-semibold text-foreground mb-4">Pricing Summary</h2>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-muted">Subtotal</dt>
                <dd className="text-sm font-medium">{formatINR(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-muted">GST ({Number(quote.taxRate)}%)</dt>
                <dd className="text-sm font-medium">{formatINR(gstAmount)}</dd>
              </div>
              {discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-sm text-muted">Discount</dt>
                  <dd className="text-sm font-medium text-danger">-{formatINR(discount)}</dd>
                </div>
              )}
              <div className="border-t border-border pt-3 flex justify-between">
                <dt className="text-sm font-semibold text-foreground">Grand Total</dt>
                <dd className="text-lg font-bold text-primary">{formatINR(grandTotal)}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-semibold text-foreground mb-4">Details</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-muted uppercase tracking-wide">Client</dt>
                <dd className="text-sm text-foreground mt-0.5">{quote.lead.clientName}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted uppercase tracking-wide">Merchant</dt>
                <dd className="text-sm text-foreground mt-0.5">{quote.merchant.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted uppercase tracking-wide">Created</dt>
                <dd className="text-sm text-foreground mt-0.5">{formatDate(quote.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted uppercase tracking-wide">Items</dt>
                <dd className="text-sm text-foreground mt-0.5">{quote.bomItems.length} line items</dd>
              </div>
            </dl>
          </div>

          {quote.notesToClient && (
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="font-semibold text-foreground mb-2">Notes to Client</h2>
              <p className="text-sm text-foreground">{quote.notesToClient}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getQuoteStatusStyle(status: string): string {
  switch (status) {
    case "draft": return "bg-surface text-muted";
    case "sent": return "bg-[#E0F0F8] text-[#2980B9]";
    case "approved": return "bg-success-light text-success";
    case "revision_requested": return "bg-warning-light text-warning";
    case "lost": return "bg-danger-light text-danger";
    default: return "bg-surface text-muted";
  }
}
