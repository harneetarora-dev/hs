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
  if (!["owner", "merchant"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { status } = body;

  const validStatuses = ["draft", "sent", "approved", "revision_requested", "lost"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const quote = await prisma.quote.findUnique({ where: { id } });
  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  const updated = await prisma.quote.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json(updated);
}
