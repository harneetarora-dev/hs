import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role !== "supervisor" && session.user.role !== "owner") {
    return NextResponse.json({ error: "Only supervisors can update production status" }, { status: 403 });
  }

  const body = await request.json();
  const { status, notes } = body;

  const validStatuses = ["confirmed", "in_production", "quality_check", "dispatched", "delivered"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  if (session.user.role === "supervisor" && order.supervisorId !== session.user.id) {
    return NextResponse.json({ error: "Not assigned to this order" }, { status: 403 });
  }

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status,
      ...(status === "delivered" || status === "closed"
        ? { actualCompletionDate: new Date() }
        : {}),
    },
  });

  await prisma.productionLog.create({
    data: {
      orderId: id,
      loggedBy: session.user.id,
      status,
      notes: notes || null,
    },
  });

  return NextResponse.json(updated);
}
