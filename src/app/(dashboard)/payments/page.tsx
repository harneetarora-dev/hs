import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate, formatINR, statusLabel } from "@/lib/format";

export default async function PaymentsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  if (session.user.role !== "owner" && session.user.role !== "merchant") {
    redirect("/orders");
  }

  let where: any = {};
  if (session.user.role === "merchant") {
    where = { merchantId: session.user.id };
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      order: { select: { id: true, orderNumber: true, clientName: true } },
      merchant: { select: { name: true } },
      payments: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const overdueInvoices = invoices.filter(
    (inv) =>
      inv.status !== "paid" &&
      inv.paymentDueDate &&
      new Date(inv.paymentDueDate) < new Date()
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Payments & Invoices</h1>
        <p className="text-muted text-sm mt-1">{invoices.length} invoices total</p>
      </div>

      {overdueInvoices.length > 0 && (
        <div className="bg-danger-light border border-danger/20 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-danger">
            {overdueInvoices.length} overdue invoice{overdueInvoices.length > 1 ? "s" : ""}
          </p>
          <p className="text-xs text-danger/80 mt-0.5">
            Total overdue: {formatINR(overdueInvoices.reduce((sum, inv) => {
              const paid = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
              return sum + (Number(inv.totalDue) - paid);
            }, 0))}
          </p>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface/50">
              <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wide">Invoice #</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wide">Order</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wide">Client</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-muted uppercase tracking-wide">Total Due</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-muted uppercase tracking-wide">Paid</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wide">Status</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wide">Due Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-muted">
                  No invoices yet
                </td>
              </tr>
            ) : (
              invoices.map((inv) => {
                const totalPaid = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
                const isOverdue = inv.status !== "paid" && inv.paymentDueDate && new Date(inv.paymentDueDate) < new Date();
                return (
                  <tr key={inv.id} className={`hover:bg-surface/30 transition-colors ${isOverdue ? "bg-danger-light/30" : ""}`}>
                    <td className="px-5 py-3">
                      <Link href={`/orders/${inv.order.id}/invoice`} className="text-sm font-medium text-primary hover:underline">
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <Link href={`/orders/${inv.order.id}`} className="text-sm text-primary hover:underline">
                        {inv.order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-sm text-foreground">{inv.order.clientName}</td>
                    <td className="px-5 py-3 text-sm text-foreground text-right font-medium">{formatINR(Number(inv.totalDue))}</td>
                    <td className="px-5 py-3 text-sm text-right">
                      <span className={totalPaid > 0 ? "text-success font-medium" : "text-muted"}>
                        {formatINR(totalPaid)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${getInvoiceStatusStyle(inv.status, !!isOverdue)}`}>
                        {isOverdue ? "Overdue" : statusLabel(inv.status)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-muted">
                      {inv.paymentDueDate ? formatDate(inv.paymentDueDate) : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getInvoiceStatusStyle(status: string, isOverdue: boolean): string {
  if (isOverdue) return "bg-danger-light text-danger";
  switch (status) {
    case "generated": return "bg-warning-light text-warning";
    case "sent": return "bg-[#E0F0F8] text-[#2980B9]";
    case "partial": return "bg-surface text-primary";
    case "paid": return "bg-success-light text-success";
    default: return "bg-surface text-muted";
  }
}
