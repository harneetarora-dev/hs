import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate, statusLabel } from "@/lib/format";

export default async function DesignRequestsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role;
  if (!["designer", "merchant", "supervisor", "owner"].includes(role)) {
    redirect("/orders");
  }

  let where: any = {};
  if (role === "designer") {
    where = { OR: [{ assignedToId: session.user.id }, { assignedToId: null }] };
  } else if (role === "merchant" || role === "supervisor") {
    where = { requestedById: session.user.id };
  }

  const requests = await prisma.designRequest.findMany({
    where,
    include: {
      requestedBy: { select: { name: true, role: true } },
      assignedTo: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Design Requests</h1>
          <p className="text-muted text-sm mt-1">
            {role === "designer" ? "Requests assigned to you or unassigned" : "Your design requests"}
          </p>
        </div>
        {(role === "merchant" || role === "supervisor") && (
          <Link
            href="/design-requests/new"
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            New Request
          </Link>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface/50">
              <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wide">Request #</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wide">Title</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wide">
                {role === "designer" ? "Requested By" : "Assigned To"}
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wide">Urgency</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wide">Status</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wide">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {requests.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-muted">
                  No design requests yet
                </td>
              </tr>
            ) : (
              requests.map((req) => (
                <tr key={req.id} className="hover:bg-surface/30 transition-colors">
                  <td className="px-5 py-3">
                    <Link href={`/design-requests/${req.id}`} className="text-sm font-medium text-primary hover:underline">
                      {req.requestNumber}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-sm text-foreground">{req.title}</td>
                  <td className="px-5 py-3 text-sm text-muted">
                    {role === "designer" ? req.requestedBy.name : (req.assignedTo?.name || "Unassigned")}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getUrgencyStyle(req.urgency)}`}>
                      {req.urgency}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusStyle(req.status)}`}>
                      {statusLabel(req.status)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-muted">{formatDate(req.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getUrgencyStyle(urgency: string): string {
  switch (urgency) {
    case "urgent": return "bg-danger-light text-danger";
    case "high": return "bg-warning-light text-warning";
    case "normal": return "bg-surface text-muted";
    case "low": return "bg-surface text-muted/70";
    default: return "bg-surface text-muted";
  }
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
