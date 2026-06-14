import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { formatDate, formatINR, statusLabel } from "@/lib/format";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      quotes: {
        orderBy: { createdAt: "desc" },
        include: {
          merchant: { select: { name: true } },
          lead: { select: { clientName: true } },
          bomItems: { select: { lineTotal: true } },
        },
      },
      orders: {
        orderBy: { createdAt: "desc" },
        include: { merchant: { select: { name: true } } },
      },
    },
  });

  if (!customer) notFound();

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/customers" className="text-muted hover:text-foreground transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{customer.name}</h1>
          {customer.companyName && <p className="text-muted">{customer.companyName}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quotes */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Quotes ({customer.quotes.length})</h2>
            </div>
            {customer.quotes.length === 0 ? (
              <div className="px-6 py-8 text-center text-muted text-sm">No quotes for this customer</div>
            ) : (
              <div className="divide-y divide-border">
                {customer.quotes.map((quote) => {
                  const total = quote.bomItems.reduce((s, i) => s + Number(i.lineTotal), 0);
                  return (
                    <Link
                      key={quote.id}
                      href={`/quotes/${quote.id}`}
                      className="block px-6 py-3 hover:bg-card-hover transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-primary">
                            {quote.quoteNumber}-V{quote.currentVersion}
                          </span>
                          <span className="text-xs text-muted ml-2">{formatDate(quote.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium">{formatINR(total)}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusStyle(quote.status)}`}>
                            {statusLabel(quote.status)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Orders */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Orders ({customer.orders.length})</h2>
            </div>
            {customer.orders.length === 0 ? (
              <div className="px-6 py-8 text-center text-muted text-sm">No orders for this customer</div>
            ) : (
              <div className="divide-y divide-border">
                {customer.orders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="block px-6 py-3 hover:bg-card-hover transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-primary">{order.orderNumber}</span>
                        <span className="text-xs text-muted ml-2">{order.clientName}</span>
                        <span className="text-xs text-muted ml-2">{formatDate(order.createdAt)}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusStyle(order.status)}`}>
                        {statusLabel(order.status)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-semibold text-foreground mb-4">Contact Details</h2>
            <dl className="space-y-3">
              {customer.phone && (
                <div>
                  <dt className="text-xs text-muted uppercase tracking-wide">Phone</dt>
                  <dd className="text-sm text-foreground mt-0.5">{customer.phone}</dd>
                </div>
              )}
              {customer.email && (
                <div>
                  <dt className="text-xs text-muted uppercase tracking-wide">Email</dt>
                  <dd className="text-sm text-foreground mt-0.5">{customer.email}</dd>
                </div>
              )}
              {customer.gstn && (
                <div>
                  <dt className="text-xs text-muted uppercase tracking-wide">GSTN</dt>
                  <dd className="text-sm text-foreground mt-0.5 font-mono">{customer.gstn}</dd>
                </div>
              )}
              {customer.address && (
                <div>
                  <dt className="text-xs text-muted uppercase tracking-wide">Address</dt>
                  <dd className="text-sm text-foreground mt-0.5">
                    {customer.address}
                    {customer.city && <>, {customer.city}</>}
                    {customer.pincode && <> - {customer.pincode}</>}
                    {customer.state && <>, {customer.state}</>}
                  </dd>
                </div>
              )}
              {customer.notes && (
                <div>
                  <dt className="text-xs text-muted uppercase tracking-wide">Notes</dt>
                  <dd className="text-sm text-foreground mt-0.5">{customer.notes}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-muted uppercase tracking-wide">Added</dt>
                <dd className="text-sm text-foreground mt-0.5">{formatDate(customer.createdAt)}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-semibold text-foreground mb-3">Summary</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-surface rounded-lg">
                <p className="text-2xl font-bold text-foreground">{customer.quotes.length}</p>
                <p className="text-xs text-muted mt-0.5">Quotes</p>
              </div>
              <div className="text-center p-3 bg-surface rounded-lg">
                <p className="text-2xl font-bold text-foreground">{customer.orders.length}</p>
                <p className="text-xs text-muted mt-0.5">Orders</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getStatusStyle(status: string): string {
  switch (status) {
    case "draft":
    case "pending_advance":
      return "bg-surface text-muted";
    case "sent":
    case "confirmed":
      return "bg-[#E0F0F8] text-[#2980B9]";
    case "approved":
    case "delivered":
    case "closed":
      return "bg-success-light text-success";
    case "revision_requested":
    case "in_production":
    case "quality_check":
      return "bg-warning-light text-warning";
    case "lost":
    case "cancelled":
      return "bg-danger-light text-danger";
    default:
      return "bg-surface text-muted";
  }
}
