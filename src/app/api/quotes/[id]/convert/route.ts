import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { generateId } from "@/lib/format";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["owner", "merchant"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      lead: true,
      bomItems: { orderBy: { lineNumber: "asc" } },
      orders: true,
    },
  });

  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  if (quote.status !== "approved") {
    return NextResponse.json({ error: "Only approved quotes can be converted to orders" }, { status: 400 });
  }

  if (quote.orders.length > 0) {
    return NextResponse.json({ error: "This quote has already been converted to an order" }, { status: 400 });
  }

  const orderCount = await prisma.order.count();
  const orderNumber = generateId("OR", orderCount + 1);

  const order = await prisma.order.create({
    data: {
      orderNumber,
      quoteId: quote.id,
      quoteVersion: quote.currentVersion,
      merchantId: quote.merchantId,
      customerId: quote.customerId,
      clientName: quote.lead.clientName,
      clientPhone: quote.lead.clientPhone,
      clientEmail: quote.lead.clientEmail,
      orderItems: {
        create: quote.bomItems.map((item, i) => ({
          itemNumber: i + 1,
          description: item.description,
          quantity: Number(item.quantity),
          bomReference: item.productCode || item.id,
        })),
      },
    },
  });

  return NextResponse.json(order, { status: 201 });
}
