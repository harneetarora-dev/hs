import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate, formatINR, statusLabel } from "@/lib/format";

export default async function QuotesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const isOwner = session.user.role === "owner";
  const isMerchant = session.user.role === "merchant";

  if (!isOwner && !isMerchant && session.user.role !== "supervisor") {
    redirect("/orders");
  }

  const quotes = await prisma.quote.findMany({
    where: isMerchant ? { merchantId: session.user.id } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      merchant: { select: { name: true } },
      lead: { select: { clientName: true } },
      customer: { select: { name: true } },
      bomItems: { select: { lineTotal: true } },
    },
  });

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quotations</h1>
          <p className="text-muted mt-1">{quotes.length} quotes</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {quotes.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-12 h-12 text-border mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <p className="text-muted">No quotations yet</p>
            <p className="text-sm text-muted mt-1">Create a quote from a lead to get started</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-surface text-left text-sm text-muted">
                <th className="px-4 py-3 font-medium">Quote #</th>
                <th className="px-4 py-3 font-medium">Client</th>
                {isOwner && <th className="px-4 py-3 font-medium">Merchant</th>}
                <th className="px-4 py-3 font-medium">Version</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {quotes.map((quote) => {
                const total = quote.bomItems.reduce(
                  (sum, item) => sum + Number(item.lineTotal),
                  0
                );
                return (
                  <tr key={quote.id} className="hover:bg-card-hover transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/quotes/${quote.id}`} className="text-primary font-medium hover:underline text-sm">
                        {quote.quoteNumber}-V{quote.currentVersion}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {quote.customer?.name || quote.lead.clientName}
                    </td>
                    {isOwner && <td className="px-4 py-3 text-sm text-muted">{quote.merchant.name}</td>}
                    <td className="px-4 py-3 text-sm text-muted">v{quote.currentVersion}</td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{formatINR(total)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${getQuoteStatusStyle(quote.status)}`}>
                        {statusLabel(quote.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">{formatDate(quote.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
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
