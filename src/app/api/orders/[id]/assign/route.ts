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

  const role = session.user.role;
  if (role !== "supervisor" && role !== "owner") {
    return NextResponse.json({ error: "Only supervisors can assign contractors" }, { status: 403 });
  }

  const body = await request.json();
  const { contractorId, locationId, startDate, expectedEndDate, notes } = body;

  if (!contractorId) {
    return NextResponse.json({ error: "Contractor is required" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  if (role === "supervisor" && order.supervisorId !== session.user.id) {
    return NextResponse.json({ error: "Not assigned to this order" }, { status: 403 });
  }

  const assignment = await prisma.orderAssignment.create({
    data: {
      orderId: id,
      contractorId,
      locationId: locationId || null,
      assignedById: session.user.id,
      startDate: startDate ? new Date(startDate) : new Date(),
      expectedEndDate: expectedEndDate ? new Date(expectedEndDate) : null,
      notes: notes || null,
    },
  });

  if (order.status === "confirmed") {
    await prisma.order.update({
      where: { id },
      data: { status: "in_production" },
    });
  }

  await prisma.productionLog.create({
    data: {
      orderId: id,
      loggedBy: session.user.id,
      status: "contractor_assigned",
      notes: `Contractor assigned${locationId ? " with location" : ""}`,
    },
  });

  return NextResponse.json(assignment, { status: 201 });
}
