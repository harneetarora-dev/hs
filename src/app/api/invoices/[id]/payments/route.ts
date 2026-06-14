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

  if (session.user.role !== "merchant" && session.user.role !== "owner") {
    return NextResponse.json({ error: "Only merchants and owners can record payments" }, { status: 403 });
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { payments: true },
  });

  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const body = await request.json();
  const { amount, paymentMethod, referenceNumber, paymentDate, notes } = body;

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Valid amount is required" }, { status: 400 });
  }

  const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = Number(invoice.totalDue) - totalPaid;

  if (amount > remaining) {
    return NextResponse.json({ error: `Amount exceeds remaining balance of ₹${remaining}` }, { status: 400 });
  }

  const payment = await prisma.payment.create({
    data: {
      invoiceId: id,
      amount,
      paymentMethod: paymentMethod || "bank_transfer",
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      referenceNumber: referenceNumber || null,
      recordedById: session.user.id,
      notes: notes || null,
    },
  });

  const newTotalPaid = totalPaid + amount;
  const newStatus = newTotalPaid >= Number(invoice.totalDue) ? "paid" : "partial";

  await prisma.invoice.update({
    where: { id },
    data: { status: newStatus },
  });

  return NextResponse.json(payment, { status: 201 });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payments = await prisma.payment.findMany({
    where: { invoiceId: id },
    include: { recordedBy: { select: { name: true } } },
    orderBy: { paymentDate: "desc" },
  });

  return NextResponse.json(payments);
}
