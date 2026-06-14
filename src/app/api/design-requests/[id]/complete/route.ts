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

  if (session.user.role !== "designer") {
    return NextResponse.json({ error: "Only designers can complete requests" }, { status: 403 });
  }

  const designRequest = await prisma.designRequest.findUnique({ where: { id } });
  if (!designRequest) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (designRequest.assignedToId !== session.user.id) {
    return NextResponse.json({ error: "Not assigned to you" }, { status: 403 });
  }

  const body = await request.json();
  const { revisionNotes } = body;

  const updated = await prisma.designRequest.update({
    where: { id },
    data: {
      status: "completed",
      completedAt: new Date(),
      revisionNotes: revisionNotes || designRequest.revisionNotes,
    },
  });

  return NextResponse.json(updated);
}
