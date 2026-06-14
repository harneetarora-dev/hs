import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate, statusLabel } from "@/lib/format";

export default async function MyTasksPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "contractor") redirect("/orders");

  const assignments = await prisma.orderAssignment.findMany({
    where: { contractorId: session.user.id },
    include: {
      order: { select: { id: true, orderNumber: true, clientName: true, status: true } },
      location: { select: { name: true } },
      assignedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">My Tasks</h1>
        <p className="text-muted text-sm mt-1">Orders assigned to you</p>
      </div>

      <div className="grid gap-4">
        {assignments.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <p className="text-muted">No tasks assigned yet</p>
          </div>
        ) : (
          assignments.map((assignment) => (
            <Link
              key={assignment.id}
              href={`/orders/${assignment.order.id}`}
              className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors block"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-primary">{assignment.order.orderNumber}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getAssignmentStatusStyle(assignment.status)}`}>
                      {statusLabel(assignment.status)}
                    </span>
                  </div>
                  <p className="text-sm text-foreground mt-1">{assignment.order.clientName}</p>
                  <p className="text-xs text-muted mt-1">
                    {assignment.location && `Location: ${assignment.location.name} · `}
                    Assigned by {assignment.assignedBy.name} · {formatDate(assignment.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  {assignment.startDate && (
                    <p className="text-xs text-muted">Start: {formatDate(assignment.startDate)}</p>
                  )}
                  {assignment.expectedEndDate && (
                    <p className="text-xs text-muted">Due: {formatDate(assignment.expectedEndDate)}</p>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

function getAssignmentStatusStyle(status: string): string {
  switch (status) {
    case "assigned": return "bg-[#E0F0F8] text-[#2980B9]";
    case "in_progress": return "bg-surface text-primary";
    case "completed": return "bg-success-light text-success";
    case "on_hold": return "bg-warning-light text-warning";
    default: return "bg-surface text-muted";
  }
}
