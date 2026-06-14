import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { generateId } from "@/lib/format";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  const userId = session.user.id;

  let whereClause = {};
  if (role === "merchant") {
    whereClause = { merchantId: userId };
  } else if (role === "supervisor") {
    whereClause = { supervisorId: userId };
  } else if (role === "contractor") {
    whereClause = { assignments: { some: { contractorId: userId } } };
  }

  const orders = await prisma.order.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    include: {
      merchant: { select: { name: true } },
      supervisor: { select: { name: true } },
      orderItems: true,
    },
  });

  return NextResponse.json(orders);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "merchant") {
    return NextResponse.json({ error: "Only merchants can create orders" }, { status: 403 });
  }

  const body = await request.json();
  const { quoteId, advanceAmount, advancePaymentMethod, items, expectedCompletionDate } = body;

  if (!quoteId) {
    return NextResponse.json({ error: "Quote ID is required" }, { status: 400 });
  }

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { lead: true },
  });

  if (!quote || quote.merchantId !== session.user.id) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  if (quote.status !== "approved") {
    return NextResponse.json({ error: "Quote must be approved before creating an order" }, { status: 400 });
  }

  const count = await prisma.order.count();
  const orderNumber = generateId("OR", count + 1);

  const order = await prisma.order.create({
    data: {
      orderNumber,
      quoteId: quote.id,
      quoteVersion: quote.currentVersion,
      merchantId: session.user.id,
      clientName: quote.lead.clientName,
      clientPhone: quote.lead.clientPhone,
      clientEmail: quote.lead.clientEmail,
      advanceAmount: advanceAmount || null,
      advanceStatus: advanceAmount ? "requested" : null,
      advancePaymentMethod: advancePaymentMethod || null,
      expectedCompletionDate: expectedCompletionDate ? new Date(expectedCompletionDate) : null,
      orderItems: {
        create: (items || [{ description: "Main item", quantity: 1 }]).map(
          (item: { description: string; quantity: number }, idx: number) => ({
            itemNumber: idx + 1,
            description: item.description,
            quantity: item.quantity || 1,
          })
        ),
      },
    },
    include: { orderItems: true },
  });

  // Update lead status to converted
  await prisma.lead.update({
    where: { id: quote.leadId },
    data: { status: "converted" },
  });

  return NextResponse.json(order, { status: 201 });
}
