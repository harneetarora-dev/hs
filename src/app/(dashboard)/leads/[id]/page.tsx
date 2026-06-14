import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { formatDate, statusLabel } from "@/lib/format";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      merchant: { select: { name: true, email: true } },
      architect: true,
      quotes: {
        orderBy: { createdAt: "desc" },
        select: { id: true, quoteNumber: true, status: true, createdAt: true },
      },
    },
  });

  if (!lead) notFound();

  if (session.user.role === "merchant" && lead.merchantId !== session.user.id) {
    redirect("/leads");
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/leads" className="text-muted hover:text-foreground transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{lead.leadNumber}</h1>
          <p className="text-muted">{lead.clientName}</p>
        </div>
        <span className={`ml-auto text-xs px-3 py-1.5 rounded-full font-medium ${getLeadStatusStyle(lead.status)}`}>
          {statusLabel(lead.status)}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-semibold text-foreground mb-4">Client Details</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-muted uppercase tracking-wide">Name</dt>
                <dd className="text-sm text-foreground mt-0.5">{lead.clientName}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted uppercase tracking-wide">Phone</dt>
                <dd className="text-sm text-foreground mt-0.5">{lead.clientPhone || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted uppercase tracking-wide">Email</dt>
                <dd className="text-sm text-foreground mt-0.5">{lead.clientEmail || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted uppercase tracking-wide">Source</dt>
                <dd className="text-sm text-foreground mt-0.5">{statusLabel(lead.source)}</dd>
              </div>
            </dl>
          </div>

          {lead.productInterest && (
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="font-semibold text-foreground mb-2">Product Interest</h2>
              <p className="text-sm text-foreground">{lead.productInterest}</p>
            </div>
          )}

          {lead.notes && (
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="font-semibold text-foreground mb-2">Notes</h2>
              <p className="text-sm text-foreground whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}

          {/* Quotes linked to this lead */}
          {lead.quotes.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="font-semibold text-foreground">Quotes</h2>
              </div>
              <div className="divide-y divide-border">
                {lead.quotes.map((quote) => (
                  <Link key={quote.id} href={`/quotes/${quote.id}`} className="px-6 py-3 flex items-center justify-between hover:bg-card-hover transition-colors block">
                    <span className="text-sm font-medium text-primary">{quote.quoteNumber}</span>
                    <span className="text-xs text-muted">{statusLabel(quote.status)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-semibold text-foreground mb-4">Info</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-muted uppercase tracking-wide">Merchant</dt>
                <dd className="text-sm text-foreground mt-0.5">{lead.merchant.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted uppercase tracking-wide">Created</dt>
                <dd className="text-sm text-foreground mt-0.5">{formatDate(lead.createdAt)}</dd>
              </div>
              {lead.architect && (
                <div>
                  <dt className="text-xs text-muted uppercase tracking-wide">Architect Referral</dt>
                  <dd className="text-sm text-foreground mt-0.5">
                    {lead.architect.name}
                    {lead.architect.firmName && (
                      <span className="text-muted"> — {lead.architect.firmName}</span>
                    )}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {(session.user.role === "merchant" || session.user.role === "owner") && lead.status !== "converted" && (
            <div className="space-y-2">
              <Link
                href={`/quotes/new?leadId=${lead.id}`}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary-light transition-colors"
              >
                Create Quote
              </Link>
            </div>
          )}
        </div>
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
