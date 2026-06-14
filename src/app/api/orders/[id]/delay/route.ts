import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role !== "supervisor") {
    return NextResponse.json({ error: "Only supervisors can log delays" }, { status: 403 });
  }

  const body = await request.json();
  const { reason, originalDate, revisedDate } = body;

  if (!reason || !originalDate || !revisedDate) {
    return NextResponse.json({ error: "Reason, original date, and revised date are required" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  if (order.supervisorId !== session.user.id) {
    return NextResponse.json({ error: "Not assigned to this order" }, { status: 403 });
  }

  const delay = await prisma.delayLog.create({
    data: {
      orderId: id,
      loggedBy: session.user.id,
      reason,
      originalDate: new Date(originalDate),
      revisedDate: new Date(revisedDate),
    },
  });

  await prisma.order.update({
    where: { id },
    data: { expectedCompletionDate: new Date(revisedDate) },
  });

  await prisma.productionLog.create({
    data: {
      orderId: id,
      loggedBy: session.user.id,
      status: "delay_logged",
      notes: `Delay: ${reason}. Revised date: ${revisedDate}`,
    },
  });

  return NextResponse.json(delay, { status: 201 });
}
