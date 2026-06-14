import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { formatDate, formatINR, statusLabel } from "@/lib/format";
import OrderActions from "./OrderActions";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      merchant: { select: { name: true } },
      supervisor: { select: { name: true } },
      quote: { select: { quoteNumber: true, id: true } },
      orderItems: {
        orderBy: { itemNumber: "asc" },
        include: {
          contractor: { select: { name: true } },
          location: { select: { name: true } },
        },
      },
      delayLogs: { orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } },
      productionLogs: { orderBy: { createdAt: "desc" }, take: 10, include: { user: { select: { name: true } } } },
      invoices: { select: { id: true } },
    },
  });

  if (!order) notFound();

  const contractors = await prisma.user.findMany({
    where: { role: "contractor", isActive: true },
    select: { id: true, name: true },
  });

  const allLocations = await prisma.location.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/orders" className="text-muted hover:text-foreground transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{order.orderNumber}</h1>
          <p className="text-muted">{order.clientName}</p>
        </div>
        <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${getOrderStatusStyle(order.status)}`}>
          {statusLabel(order.status)}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Order Items</h2>
            </div>
            <div className="divide-y divide-border">
              {order.orderItems.map((item) => (
                <div key={item.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{item.description}</p>
                      <p className="text-xs text-muted mt-0.5">
                        Qty: {item.quantity}
                        {item.contractor && ` · Contractor: ${item.contractor.name}`}
                        {item.location && ` · Location: ${item.location.name}`}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getItemStatusStyle(item.status)}`}>
                      {statusLabel(item.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delay Logs */}
          {order.delayLogs.length > 0 && (
            <div className="bg-card border border-warning/30 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-warning/30 bg-warning-light">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <svg className="w-4 h-4 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  Delays Logged
                </h2>
              </div>
              <div className="divide-y divide-border">
                {order.delayLogs.map((log) => (
                  <div key={log.id} className="px-6 py-3">
                    <p className="text-sm text-foreground">{log.reason}</p>
                    <p className="text-xs text-muted mt-1">
                      {formatDate(log.originalDate)} → {formatDate(log.revisedDate)} · by {log.user.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Production Logs */}
          {order.productionLogs.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="font-semibold text-foreground">Production Activity</h2>
              </div>
              <div className="divide-y divide-border">
                {order.productionLogs.map((log) => (
                  <div key={log.id} className="px-6 py-3 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-foreground">{statusLabel(log.status)}</span>
                      {log.notes && <p className="text-xs text-muted mt-0.5">{log.notes}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted">{log.user.name}</p>
                      <p className="text-xs text-muted">{formatDate(log.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <OrderActions
            orderId={order.id}
            orderStatus={order.status}
            userRole={session.user.role}
            userId={session.user.id}
            supervisorId={order.supervisorId}
            merchantId={order.merchantId}
            contractors={contractors}
            locations={allLocations}
            hasInvoice={order.invoices.length > 0}
          />

          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-semibold text-foreground mb-4">Order Info</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-muted uppercase tracking-wide">Client</dt>
                <dd className="text-sm text-foreground mt-0.5">{order.clientName}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted uppercase tracking-wide">Phone</dt>
                <dd className="text-sm text-foreground mt-0.5">{order.clientPhone || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted uppercase tracking-wide">Quote</dt>
                <dd className="text-sm mt-0.5">
                  <Link href={`/quotes/${order.quote.id}`} className="text-primary hover:underline">
                    {order.quote.quoteNumber} (v{order.quoteVersion})
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted uppercase tracking-wide">Merchant</dt>
                <dd className="text-sm text-foreground mt-0.5">{order.merchant.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted uppercase tracking-wide">Supervisor</dt>
                <dd className="text-sm text-foreground mt-0.5">{order.supervisor?.name || "Not assigned"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted uppercase tracking-wide">Created</dt>
                <dd className="text-sm text-foreground mt-0.5">{formatDate(order.createdAt)}</dd>
              </div>
              {order.expectedCompletionDate && (
                <div>
                  <dt className="text-xs text-muted uppercase tracking-wide">Expected Completion</dt>
                  <dd className="text-sm text-foreground mt-0.5">{formatDate(order.expectedCompletionDate)}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Advance Payment */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-semibold text-foreground mb-4">Advance Payment</h2>
            {order.advanceAmount ? (
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm text-muted">Amount</dt>
                  <dd className="text-sm font-medium">{formatINR(Number(order.advanceAmount))}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-muted">Status</dt>
                  <dd className={`text-xs px-2 py-0.5 rounded-full font-medium ${order.advanceStatus === "received" ? "bg-success-light text-success" : "bg-warning-light text-warning"}`}>
                    {statusLabel(order.advanceStatus || "")}
                  </dd>
                </div>
                {order.advanceReceivedDate && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-muted">Received</dt>
                    <dd className="text-sm">{formatDate(order.advanceReceivedDate)}</dd>
                  </div>
                )}
                {order.advancePaymentMethod && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-muted">Method</dt>
                    <dd className="text-sm">{order.advancePaymentMethod}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-sm text-muted">No advance requested</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getOrderStatusStyle(status: string): string {
  switch (status) {
    case "pending_advance": return "bg-warning-light text-warning";
    case "confirmed": return "bg-[#E0F0F8] text-[#2980B9]";
    case "in_production": return "bg-surface text-primary";
    case "quality_check": return "bg-[#F0E8F8] text-[#7B2D8B]";
    case "dispatched": return "bg-warning-light text-[#8B6914]";
    case "delivered": case "closed": return "bg-success-light text-success";
    case "cancelled": return "bg-danger-light text-danger";
    default: return "bg-surface text-muted";
  }
}

function getItemStatusStyle(status: string): string {
  switch (status) {
    case "pending": return "bg-surface text-muted";
    case "in_production": return "bg-surface text-primary";
    case "complete": return "bg-success-light text-success";
    case "dispatched": return "bg-warning-light text-warning";
    default: return "bg-surface text-muted";
  }
}
