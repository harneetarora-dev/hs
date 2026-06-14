import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/format";

async function getDashboardData() {
  const [
    totalLeads,
    activeOrders,
    completedOrders,
    overdueInvoices,
    recentOrders,
    delayedOrders,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.order.count({
      where: { status: { in: ["confirmed", "in_production", "quality_check"] } },
    }),
    prisma.order.count({ where: { status: "closed" } }),
    prisma.invoice.count({ where: { status: "overdue" } }),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { merchant: { select: { name: true } } },
    }),
    prisma.order.count({
      where: { delayLogs: { some: {} } },
    }),
  ]);

  const totalRevenue = await prisma.payment.aggregate({
    _sum: { amount: true },
  });

  return {
    totalLeads,
    activeOrders,
    completedOrders,
    overdueInvoices,
    delayedOrders,
    totalRevenue: totalRevenue._sum.amount ?? 0,
    recentOrders,
  };
}

export default async function DashboardPage() {
  const session = await auth();
  if (session?.user.role !== "owner") {
    redirect("/orders");
  }

  const data = await getDashboardData();

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted mt-1">Business overview at a glance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Active Orders"
          value={String(data.activeOrders)}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          }
          color="primary"
        />
        <StatCard
          label="Total Leads"
          value={String(data.totalLeads)}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          }
          color="secondary"
        />
        <StatCard
          label="Delayed Orders"
          value={String(data.delayedOrders)}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          }
          color="warning"
        />
        <StatCard
          label="Overdue Payments"
          value={String(data.overdueInvoices)}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
          }
          color="danger"
        />
      </div>

      {/* Revenue Card */}
      <div className="bg-card border border-border rounded-xl p-6 mb-8">
        <h2 className="text-sm font-medium text-muted mb-1">Total Revenue Collected</h2>
        <p className="text-3xl font-bold text-primary">
          {formatINR(Number(data.totalRevenue))}
        </p>
        <p className="text-sm text-muted mt-1">
          {data.completedOrders} orders closed
        </p>
      </div>

      {/* Recent Orders */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Recent Orders</h2>
        </div>
        {data.recentOrders.length === 0 ? (
          <div className="p-8 text-center text-muted">
            No orders yet. Orders will appear here once created.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {data.recentOrders.map((order) => (
              <div key={order.id} className="px-6 py-4 flex items-center justify-between hover:bg-card-hover transition-colors">
                <div>
                  <p className="font-medium text-foreground">{order.orderNumber}</p>
                  <p className="text-sm text-muted">{order.clientName} &middot; {order.merchant.name}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusStyle(order.status)}`}>
                  {order.status.replace(/_/g, " ")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getStatusStyle(status: string): string {
  switch (status) {
    case "in_production":
      return "bg-surface text-primary";
    case "quality_check":
      return "bg-[#E0F0F8] text-[#1A6B8A]";
    case "dispatched":
      return "bg-warning-light text-warning";
    case "delivered":
    case "closed":
      return "bg-success-light text-success";
    case "cancelled":
      return "bg-danger-light text-danger";
    default:
      return "bg-surface text-muted";
  }
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: "primary" | "secondary" | "warning" | "danger";
}) {
  const colorMap = {
    primary: "bg-surface text-primary",
    secondary: "bg-[#E0F0F8] text-[#2980B9]",
    warning: "bg-warning-light text-warning",
    danger: "bg-danger-light text-danger",
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted mt-0.5">{label}</p>
    </div>
  );
}
