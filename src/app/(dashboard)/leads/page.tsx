import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate, statusLabel } from "@/lib/format";

export default async function LeadsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const isOwner = session.user.role === "owner";
  const isMerchant = session.user.role === "merchant";

  if (!isOwner && !isMerchant) redirect("/orders");

  const leads = await prisma.lead.findMany({
    where: isMerchant ? { merchantId: session.user.id } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      merchant: { select: { name: true } },
      architect: { select: { name: true } },
    },
  });

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-muted mt-1">{leads.length} total leads</p>
        </div>
        {(isMerchant || isOwner) && (
          <Link
            href="/leads/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary-light transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Lead
          </Link>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {leads.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-12 h-12 text-border mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
            <p className="text-muted">No leads yet</p>
            {(isMerchant || isOwner) && (
              <Link href="/leads/new" className="text-primary text-sm font-medium hover:underline mt-2 inline-block">
                Create your first lead
              </Link>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-surface text-left text-sm text-muted">
                <th className="px-4 py-3 font-medium">Lead #</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Source</th>
                {isOwner && <th className="px-4 py-3 font-medium">Merchant</th>}
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-card-hover transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/leads/${lead.id}`} className="text-primary font-medium hover:underline text-sm">
                      {lead.leadNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{lead.clientName}</p>
                      <p className="text-xs text-muted">{lead.clientPhone || lead.clientEmail || "—"}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted">
                    {statusLabel(lead.source)}
                    {lead.architect && (
                      <span className="text-xs text-accent ml-1">({lead.architect.name})</span>
                    )}
                  </td>
                  {isOwner && <td className="px-4 py-3 text-sm text-muted">{lead.merchant.name}</td>}
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getLeadStatusStyle(lead.status)}`}>
                      {statusLabel(lead.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted">{formatDate(lead.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function getLeadStatusStyle(status: string): string {
  switch (status) {
    case "new": return "bg-[#E0F0F8] text-[#2980B9]";
    case "contacted": return "bg-surface text-primary";
    case "qualified": return "bg-warning-light text-warning";
    case "converted": return "bg-success-light text-success";
    case "lost": return "bg-danger-light text-danger";
    default: return "bg-surface text-muted";
  }
}
