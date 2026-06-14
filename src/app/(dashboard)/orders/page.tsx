import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate, formatINR, statusLabel } from "@/lib/format";

export default async function OrdersPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role;
  const userId = session.user.id;

  let whereClause = {};
  if (role === "merchant") {
    whereClause = { merchantId: userId };
  } else if (role === "supervisor") {
    whereClause = { supervisorId: userId };
  } else if (role === "contractor") {
    whereClause = { assignments: { some: { contractorId: userId } } };
  }

  const orders = await prisma.order.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    include: {
      merchant: { select: { name: true } },
      supervisor: { select: { name: true } },
      orderItems: { select: { id: true, status: true } },
    },
  });

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Orders</h1>
          <p className="text-muted mt-1">{orders.length} orders</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {orders.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-12 h-12 text-border mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            <p className="text-muted">No orders yet</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-surface text-left text-sm text-muted">
                <th className="px-4 py-3 font-medium">Order #</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Items</th>
                <th className="px-4 py-3 font-medium">Advance</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Supervisor</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-card-hover transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/orders/${order.id}`} className="text-primary font-medium hover:underline text-sm">
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-foreground">{order.clientName}</p>
                    <p className="text-xs text-muted">{order.merchant.name}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted">{order.orderItems.length} items</td>
                  <td className="px-4 py-3 text-sm">
                    {order.advanceAmount ? (
                      <div>
                        <span className="text-foreground">{formatINR(Number(order.advanceAmount))}</span>
                        <span className={`ml-1 text-xs ${order.advanceStatus === "received" ? "text-success" : "text-warning"}`}>
                          ({statusLabel(order.advanceStatus || "")})
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getOrderStatusStyle(order.status)}`}>
                      {statusLabel(order.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted">
                    {order.supervisor?.name || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted">{formatDate(order.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
    case "delivered": return "bg-success-light text-success";
    case "closed": return "bg-success-light text-success";
    case "cancelled": return "bg-danger-light text-danger";
    default: return "bg-surface text-muted";
  }
}
