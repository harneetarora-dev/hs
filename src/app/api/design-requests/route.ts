import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { generateId } from "@/lib/format";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
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

  return NextResponse.json(requests);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role !== "merchant" && session.user.role !== "supervisor") {
    return NextResponse.json({ error: "Only merchants and supervisors can create design requests" }, { status: 403 });
  }

  const body = await request.json();
  const { entityType = "order", entityId, title, description, urgency = "normal", designerId } = body;

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const count = await prisma.designRequest.count();
  const requestNumber = generateId("DR", count + 1);

  const designRequest = await prisma.designRequest.create({
    data: {
      requestNumber,
      entityType,
      entityId: entityId || "",
      requestedById: session.user.id,
      assignedToId: designerId || null,
      title,
      description: description || null,
      urgency,
      status: designerId ? "in_progress" : "pending",
    },
  });

  return NextResponse.json(designRequest, { status: 201 });
}
