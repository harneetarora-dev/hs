import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { formatDate, formatINR, statusLabel } from "@/lib/format";
import InvoiceActions from "./InvoiceActions";

export default async function OrderInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      quote: { include: { bomItems: { orderBy: { lineNumber: "asc" } } } },
      invoices: { include: { payments: { include: { recordedBy: { select: { name: true } } }, orderBy: { paymentDate: "desc" } } } },
      merchant: { select: { name: true, phone: true } },
    },
  });

  if (!order) notFound();

  const invoice = order.invoices[0] || null;
  const canCreateInvoice = !invoice && session.user.role === "merchant" && order.merchantId === session.user.id;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/orders/${id}`} className="text-muted hover:text-foreground transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">
            {invoice ? invoice.invoiceNumber : "Generate Invoice"}
          </h1>
          <p className="text-muted text-sm">{order.orderNumber} — {order.clientName}</p>
        </div>
        {invoice && (
          <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${getInvoiceStatusStyle(invoice.status)}`}>
            {statusLabel(invoice.status)}
          </span>
        )}
      </div>

      {invoice ? (
        <div className="space-y-6">
          {/* Invoice Summary */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <p className="text-xs text-muted uppercase tracking-wide">Subtotal</p>
                <p className="text-lg font-semibold text-foreground mt-0.5">{formatINR(Number(invoice.subtotal))}</p>
              </div>
              <div>
                <p className="text-xs text-muted uppercase tracking-wide">GST ({Number(invoice.gstRate)}%)</p>
                <p className="text-lg font-semibold text-foreground mt-0.5">{formatINR(Number(invoice.gstAmount))}</p>
              </div>
              <div>
                <p className="text-xs text-muted uppercase tracking-wide">Advance Deducted</p>
                <p className="text-lg font-semibold text-success mt-0.5">-{formatINR(Number(invoice.advanceDeducted))}</p>
              </div>
              <div>
                <p className="text-xs text-muted uppercase tracking-wide">Total Due</p>
                <p className="text-lg font-bold text-primary mt-0.5">{formatINR(Number(invoice.totalDue))}</p>
              </div>
            </div>

            {Number(invoice.discount) > 0 && (
              <p className="text-sm text-muted">Discount applied: {formatINR(Number(invoice.discount))}</p>
            )}
            {invoice.paymentDueDate && (
              <p className="text-sm text-muted mt-1">Payment due: {formatDate(invoice.paymentDueDate)}</p>
            )}
          </div>

          {/* BOM Items */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Line Items</h2>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface/50">
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-muted">#</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-muted">Description</th>
                  <th className="text-right px-5 py-2.5 text-xs font-medium text-muted">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {order.quote.bomItems.map((item, i) => (
                  <tr key={item.id}>
                    <td className="px-5 py-2.5 text-sm text-muted">{i + 1}</td>
                    <td className="px-5 py-2.5 text-sm text-foreground">{item.description}</td>
                    <td className="px-5 py-2.5 text-sm text-foreground text-right">{formatINR(Number(item.lineTotal))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Payments */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Payments Received</h2>
              <span className="text-sm text-muted">
                {formatINR(invoice.payments.reduce((s, p) => s + Number(p.amount), 0))} of {formatINR(Number(invoice.totalDue))}
              </span>
            </div>
            {invoice.payments.length === 0 ? (
              <div className="px-6 py-8 text-center text-muted text-sm">No payments recorded yet</div>
            ) : (
              <div className="divide-y divide-border">
                {invoice.payments.map((payment) => (
                  <div key={payment.id} className="px-6 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{formatINR(Number(payment.amount))}</p>
                      <p className="text-xs text-muted">
                        {payment.paymentMethod || "—"}{payment.referenceNumber ? ` · Ref: ${payment.referenceNumber}` : ""} · by {payment.recordedBy.name}
                      </p>
                    </div>
                    <p className="text-xs text-muted">{formatDate(payment.paymentDate)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <InvoiceActions
            invoiceId={invoice.id}
            invoiceStatus={invoice.status}
            totalDue={Number(invoice.totalDue)}
            totalPaid={invoice.payments.reduce((s, p) => s + Number(p.amount), 0)}
            userRole={session.user.role}
          />
        </div>
      ) : canCreateInvoice ? (
        <InvoiceActions
          invoiceId=""
          invoiceStatus=""
          totalDue={0}
          totalPaid={0}
          userRole={session.user.role}
          orderId={id}
          canCreate={true}
        />
      ) : (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <p className="text-muted">No invoice generated for this order yet.</p>
        </div>
      )}
    </div>
  );
}

function getInvoiceStatusStyle(status: string): string {
  switch (status) {
    case "generated": return "bg-warning-light text-warning";
    case "sent": return "bg-[#E0F0F8] text-[#2980B9]";
    case "partially_paid": return "bg-surface text-primary";
    case "paid": return "bg-success-light text-success";
    default: return "bg-surface text-muted";
  }
}
