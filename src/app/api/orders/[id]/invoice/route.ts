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

  if (session.user.role !== "merchant") {
    return NextResponse.json({ error: "Only merchants can generate invoices" }, { status: 403 });
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      quote: { include: { bomItems: true } },
      invoices: true,
    },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.merchantId !== session.user.id) {
    return NextResponse.json({ error: "Not your order" }, { status: 403 });
  }

  if (order.invoices.length > 0) {
    return NextResponse.json({ error: "Invoice already exists for this order" }, { status: 409 });
  }

  const body = await request.json();
  const { gstRate = 18, discount = 0, paymentDueDate, notes } = body;

  const subtotal = order.quote.bomItems.reduce(
    (sum, item) => sum + Number(item.lineTotal),
    0
  );
  const gstAmount = subtotal * (gstRate / 100);
  const advanceDeducted = Number(order.advanceAmount || 0);
  const totalDue = subtotal + gstAmount - advanceDeducted - discount;

  const count = await prisma.invoice.count();
  const invoiceNumber = generateId("INV", count + 1);

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      orderId: id,
      merchantId: session.user.id,
      subtotal,
      gstRate,
      gstAmount,
      advanceDeducted,
      discount,
      totalDue: Math.max(totalDue, 0),
      paymentDueDate: paymentDueDate ? new Date(paymentDueDate) : null,
      notes: notes || null,
    },
  });

  return NextResponse.json(invoice, { status: 201 });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const invoice = await prisma.invoice.findFirst({
    where: { orderId: id },
    include: {
      order: {
        include: {
          quote: { include: { bomItems: { orderBy: { lineNumber: "asc" } } } },
          merchant: { select: { name: true, phone: true } },
        },
      },
      payments: { orderBy: { paymentDate: "desc" } },
    },
  });

  if (!invoice) return NextResponse.json({ error: "No invoice found" }, { status: 404 });

  return NextResponse.json(invoice);
}
