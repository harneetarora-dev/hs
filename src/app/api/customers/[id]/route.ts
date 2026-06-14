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

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      quotes: {
        orderBy: { createdAt: "desc" },
        include: {
          lead: { select: { clientName: true } },
          merchant: { select: { name: true } },
          bomItems: { select: { lineTotal: true } },
        },
      },
      orders: {
        orderBy: { createdAt: "desc" },
        include: { merchant: { select: { name: true } } },
      },
    },
  });

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  return NextResponse.json(customer);
}

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
  const { name, companyName, phone, email, gstn, address, city, state, pincode, notes } = body;

  const customer = await prisma.customer.update({
    where: { id },
    data: { name, companyName, phone, email, gstn, address, city, state, pincode, notes },
  });

  return NextResponse.json(customer);
}
