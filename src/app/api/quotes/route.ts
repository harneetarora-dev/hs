import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { generateId } from "@/lib/format";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isOwner = session.user.role === "owner";
  const isMerchant = session.user.role === "merchant";

  const quotes = await prisma.quote.findMany({
    where: isMerchant ? { merchantId: session.user.id } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      merchant: { select: { name: true } },
      lead: { select: { clientName: true } },
      bomItems: { select: { lineTotal: true } },
    },
  });

  return NextResponse.json(quotes);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "merchant") {
    return NextResponse.json({ error: "Only merchants can create quotes" }, { status: 403 });
  }

  const body = await request.json();
  const { leadId, taxRate, notesToClient, internalNotes } = body;

  if (!leadId) {
    return NextResponse.json({ error: "Lead ID is required" }, { status: 400 });
  }

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead || lead.merchantId !== session.user.id) {
    return NextResponse.json({ error: "Lead not found or not yours" }, { status: 404 });
  }

  const count = await prisma.quote.count();
  const quoteNumber = generateId("QT", count + 1);

  const quote = await prisma.quote.create({
    data: {
      quoteNumber,
      leadId,
      merchantId: session.user.id,
      taxRate: taxRate || 18.00,
      notesToClient: notesToClient || null,
      internalNotes: internalNotes || null,
    },
  });

  // Create initial version
  await prisma.quoteVersion.create({
    data: {
      quoteId: quote.id,
      versionNumber: 1,
      changeSummary: "Initial version",
      changeReason: "Quote created",
      createdById: session.user.id,
      snapshotData: { bomItems: [], taxRate: quote.taxRate, discountType: "none", discountValue: 0 },
    },
  });

  return NextResponse.json(quote, { status: 201 });
}
