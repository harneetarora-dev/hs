import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { formatDate, formatDateTime, statusLabel } from "@/lib/format";
import DesignRequestActions from "./DesignRequestActions";

export default async function DesignRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const request = await prisma.designRequest.findUnique({
    where: { id },
    include: {
      requestedBy: { select: { name: true, role: true, phone: true } },
      assignedTo: { select: { id: true, name: true } },
    },
  });

  if (!request) notFound();

  const designers = await prisma.user.findMany({
    where: { role: "designer", isActive: true },
    select: { id: true, name: true },
  });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/design-requests" className="text-muted hover:text-foreground transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{request.requestNumber}</h1>
          <p className="text-muted text-sm">{request.title}</p>
        </div>
        <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${getStatusStyle(request.status)}`}>
          {statusLabel(request.status)}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-semibold text-foreground mb-3">Description</h2>
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {request.description || "No description provided"}
            </p>
          </div>

          {request.revisionNotes && (
            <div className="bg-card border border-warning/30 rounded-xl p-6">
              <h2 className="font-semibold text-foreground mb-3">Revision Notes</h2>
              <p className="text-sm text-foreground whitespace-pre-wrap">{request.revisionNotes}</p>
            </div>
          )}

          <DesignRequestActions
            requestId={request.id}
            status={request.status}
            userRole={session.user.role}
            userId={session.user.id}
            assignedToId={request.assignedToId}
            designers={designers}
          />
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-semibold text-foreground mb-4">Details</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-muted uppercase tracking-wide">Requested By</dt>
                <dd className="text-sm text-foreground mt-0.5">{request.requestedBy.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted uppercase tracking-wide">Assigned To</dt>
                <dd className="text-sm text-foreground mt-0.5">{request.assignedTo?.name || "Unassigned"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted uppercase tracking-wide">Urgency</dt>
                <dd className="mt-0.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getUrgencyStyle(request.urgency)}`}>
                    {request.urgency}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted uppercase tracking-wide">Created</dt>
                <dd className="text-sm text-foreground mt-0.5">{formatDateTime(request.createdAt)}</dd>
              </div>
              {request.completedAt && (
                <div>
                  <dt className="text-xs text-muted uppercase tracking-wide">Completed</dt>
                  <dd className="text-sm text-foreground mt-0.5">{formatDateTime(request.completedAt)}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

function getStatusStyle(status: string): string {
  switch (status) {
    case "pending": return "bg-warning-light text-warning";
    case "in_progress": return "bg-[#E0F0F8] text-[#2980B9]";
    case "in_progress": return "bg-surface text-primary";
    case "completed": return "bg-success-light text-success";
    case "revision_requested": return "bg-danger-light text-danger";
    default: return "bg-surface text-muted";
  }
}

function getUrgencyStyle(urgency: string): string {
  switch (urgency) {
    case "urgent": return "bg-danger-light text-danger";
    case "high": return "bg-warning-light text-warning";
    default: return "bg-surface text-muted";
  }
}
