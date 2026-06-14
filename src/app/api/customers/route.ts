import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { quotes: true, orders: true } },
    },
  });

  return NextResponse.json(customers);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["owner", "merchant"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { name, companyName, phone, email, gstn, address, city, state, pincode, notes } = body;

  if (!name) {
    return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
  }

  const customer = await prisma.customer.create({
    data: { name, companyName, phone, email, gstn, address, city, state, pincode, notes },
  });

  return NextResponse.json(customer, { status: 201 });
}
