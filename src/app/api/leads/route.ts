import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { generateId } from "@/lib/format";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isOwner = session.user.role === "owner";
  const isMerchant = session.user.role === "merchant";

  if (!isOwner && !isMerchant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const leads = await prisma.lead.findMany({
    where: isMerchant ? { merchantId: session.user.id } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      merchant: { select: { name: true } },
      architect: { select: { name: true } },
    },
  });

  return NextResponse.json(leads);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "merchant") {
    return NextResponse.json({ error: "Only merchants can create leads" }, { status: 403 });
  }

  const body = await request.json();
  const { clientName, clientPhone, clientEmail, source, productInterest, notes, architectId } = body;

  if (!clientName || !source) {
    return NextResponse.json({ error: "Client name and source are required" }, { status: 400 });
  }

  const count = await prisma.lead.count();
  const leadNumber = generateId("LD", count + 1);

  const lead = await prisma.lead.create({
    data: {
      leadNumber,
      merchantId: session.user.id,
      clientName,
      clientPhone: clientPhone || null,
      clientEmail: clientEmail || null,
      source,
      architectId: architectId || null,
      productInterest: productInterest || null,
      notes: notes || null,
    },
  });

  return NextResponse.json(lead, { status: 201 });
}
