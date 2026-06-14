import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/format";

export default async function CustomersPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { quotes: true, orders: true } },
    },
  });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customers</h1>
          <p className="text-muted text-sm mt-1">{customers.length} customer{customers.length !== 1 ? "s" : ""}</p>
        </div>
        {["owner", "merchant"].includes(session.user.role) && (
          <Link
            href="/customers/new"
            className="px-4 py-2.5 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary-light transition-colors"
          >
            + New Customer
          </Link>
        )}
      </div>

      {customers.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <p className="text-muted">No customers yet. Add your first customer to start tracking.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface text-left text-muted">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Company</th>
                <th className="px-5 py-3 font-medium">Contact</th>
                <th className="px-5 py-3 font-medium text-center">Quotes</th>
                <th className="px-5 py-3 font-medium text-center">Orders</th>
                <th className="px-5 py-3 font-medium">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-card-hover transition-colors">
                  <td className="px-5 py-3">
                    <Link href={`/customers/${customer.id}`} className="font-medium text-primary hover:underline">
                      {customer.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-muted">{customer.companyName || "—"}</td>
                  <td className="px-5 py-3">
                    <div>
                      {customer.phone && <p className="text-muted">{customer.phone}</p>}
                      {customer.email && <p className="text-muted text-xs">{customer.email}</p>}
                      {!customer.phone && !customer.email && <span className="text-muted">—</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-surface text-xs font-medium text-foreground">
                      {customer._count.quotes}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-surface text-xs font-medium text-foreground">
                      {customer._count.orders}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-muted text-xs">{formatDate(customer.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
