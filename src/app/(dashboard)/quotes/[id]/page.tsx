import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { formatDate, formatINR, statusLabel } from "@/lib/format";
import { COMPANY, DEFAULT_TERMS } from "@/lib/company";
import QuoteActions from "./QuoteActions";

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      lead: { select: { clientName: true, clientPhone: true, clientEmail: true, id: true } },
      customer: true,
      merchant: { select: { name: true } },
      bomItems: { orderBy: { lineNumber: "asc" } },
      versions: { orderBy: { versionNumber: "desc" } },
      orders: { select: { id: true, orderNumber: true } },
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

  const displayNumber = `${quote.quoteNumber}-V${quote.currentVersion}`;
  const customerName = quote.customer?.name || quote.lead.clientName;
  const customerPhone = quote.customer?.phone || quote.lead.clientPhone;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/quotes" className="text-muted hover:text-foreground transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{displayNumber}</h1>
          <p className="text-muted">{customerName}</p>
        </div>
        <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${getQuoteStatusStyle(quote.status)}`}>
          {statusLabel(quote.status)}
        </span>
        {(session.user.role === "merchant" || session.user.role === "owner") && (
          <div className="flex items-center gap-2">
            {(quote.status === "draft" || quote.status === "revision_requested") && (
              <Link
                href={`/quotes/${quote.id}/edit`}
                className="px-4 py-2 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary-light transition-colors"
              >
                Edit Items
              </Link>
            )}
            <Link
              href={`/quotes/${quote.id}/print`}
              target="_blank"
              className="px-4 py-2 bg-surface text-foreground border border-border rounded-lg font-medium text-sm hover:bg-surface-hover transition-colors"
            >
              Print / PDF
            </Link>
          </div>
        )}
      </div>

      {/* Company Header */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-lg font-bold text-foreground">{COMPANY.name}</h2>
            <p className="text-xs text-muted mt-0.5">GSTN: {COMPANY.gstn}</p>
            <p className="text-xs text-muted mt-2">
              <span className="font-medium">{COMPANY.office.label}:</span> {COMPANY.office.address}, {COMPANY.office.city} - {COMPANY.office.pincode}, {COMPANY.office.state}
            </p>
            <p className="text-xs text-muted mt-0.5">
              <span className="font-medium">{COMPANY.factory.label}:</span> {COMPANY.factory.address}, {COMPANY.factory.city} - {COMPANY.factory.pincode}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted">Quote To:</p>
            <p className="text-sm font-medium text-foreground">{customerName}</p>
            {customerPhone && <p className="text-xs text-muted">{customerPhone}</p>}
            {quote.customer?.email && <p className="text-xs text-muted">{quote.customer.email}</p>}
            {quote.customer?.gstn && <p className="text-xs text-muted">GSTN: {quote.customer.gstn}</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Product Items Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Product Items</h2>
            </div>
            {quote.bomItems.length === 0 ? (
              <div className="p-8 text-center text-muted">
                <p>No items yet</p>
                {(session.user.role === "merchant" || session.user.role === "owner") && (
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
                      <th className="px-4 py-2.5 font-medium w-12">#</th>
                      <th className="px-4 py-2.5 font-medium w-24">SKU</th>
                      <th className="px-4 py-2.5 font-medium">Description</th>
                      <th className="px-4 py-2.5 font-medium w-20 text-center">Qty</th>
                      <th className="px-4 py-2.5 font-medium w-16">Unit</th>
                      <th className="px-4 py-2.5 font-medium w-28 text-right">Price/Unit</th>
                      <th className="px-4 py-2.5 font-medium w-28 text-right">Amount</th>
                      <th className="px-4 py-2.5 font-medium w-16 text-center">Files</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {quote.bomItems.map((item) => (
                      <tr key={item.id} className="hover:bg-card-hover">
                        <td className="px-4 py-3 text-muted">{item.lineNumber}</td>
                        <td className="px-4 py-3 text-muted font-mono text-xs">
                          {item.productCode || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{item.description}</p>
                          {item.notes && (
                            <p className="text-xs text-muted mt-0.5">{item.notes}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-muted">
                          {Number(item.quantity)}
                        </td>
                        <td className="px-4 py-3 text-muted text-xs">
                          {unitLabel(item.unit)}
                        </td>
                        <td className="px-4 py-3 text-right text-muted">
                          {formatINR(Number(item.ratePerUnit))}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatINR(Number(item.lineTotal))}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {item.imageUrl && (
                              <a href={item.imageUrl} target="_blank" className="text-primary hover:text-primary-light" title="View image">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                                </svg>
                              </a>
                            )}
                            {item.drawingUrl && (
                              <a href={item.drawingUrl} target="_blank" className="text-primary hover:text-primary-light" title="View drawing">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                </svg>
                              </a>
                            )}
                            {!item.imageUrl && !item.drawingUrl && (
                              <span className="text-muted">—</span>
                            )}
                          </div>
                        </td>
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
                      <span className="text-sm font-medium text-foreground">
                        {quote.quoteNumber}-V{version.versionNumber}
                      </span>
                      <span className="text-xs text-muted">{formatDate(version.createdAt)}</span>
                    </div>
                    {version.changeSummary && (
                      <p className="text-xs text-muted mt-1">{version.changeSummary}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
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
                <dd className="text-sm text-foreground mt-0.5">{customerName}</dd>
              </div>
              {quote.customer && (
                <div>
                  <dt className="text-xs text-muted uppercase tracking-wide">Customer</dt>
                  <dd className="text-sm mt-0.5">
                    <Link href={`/customers/${quote.customer.id}`} className="text-primary hover:underline">
                      {quote.customer.name}
                    </Link>
                  </dd>
                </div>
              )}
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
              <h2 className="font-semibold text-foreground mb-2">Terms & Conditions</h2>
              <p className="text-sm text-foreground whitespace-pre-wrap">{quote.notesToClient}</p>
            </div>
          )}

          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-semibold text-foreground mb-3">Bank Details</h2>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Account Name</dt>
                <dd className="text-foreground font-medium">{COMPANY.bank.accountName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">A/C No.</dt>
                <dd className="text-foreground font-medium">{COMPANY.bank.accountNumber}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">IFSC</dt>
                <dd className="text-foreground font-medium">{COMPANY.bank.ifsc}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Bank</dt>
                <dd className="text-foreground text-xs">{COMPANY.bank.name}</dd>
              </div>
            </dl>
          </div>

          {/* Quote Actions */}
          <QuoteActions
            quoteId={quote.id}
            quoteStatus={quote.status}
            userRole={session.user.role}
            hasOrder={quote.orders.length > 0}
            orderId={quote.orders[0]?.id}
            orderNumber={quote.orders[0]?.orderNumber}
          />
        </div>
      </div>
    </div>
  );
}

function unitLabel(unit: string): string {
  const labels: Record<string, string> = {
    piece: "Pcs",
    sq_ft: "Sq.ft",
    cu_ft: "Cu.ft",
    running_ft: "Rft",
    kg: "Kg",
    litre: "Ltr",
    set: "Set",
  };
  return labels[unit] || unit;
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
