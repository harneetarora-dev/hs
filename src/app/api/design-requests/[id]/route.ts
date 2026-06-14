import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const designRequest = await prisma.designRequest.findUnique({
    where: { id },
    include: {
      requestedBy: { select: { name: true, role: true, phone: true } },
      assignedTo: { select: { name: true } },
    },
  });

  if (!designRequest) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(designRequest);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { assignedToId, status, revisionNotes } = body;

  const designRequest = await prisma.designRequest.findUnique({ where: { id } });
  if (!designRequest) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: any = {};
  if (assignedToId) {
    updateData.assignedToId = assignedToId;
    updateData.status = "in_progress";
  }
  if (status) updateData.status = status;
  if (revisionNotes) updateData.revisionNotes = revisionNotes;

  const updated = await prisma.designRequest.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(updated);
}
