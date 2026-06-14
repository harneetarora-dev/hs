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

  const bomItems = await prisma.bomItem.findMany({
    where: { quoteId: id },
    orderBy: { lineNumber: "asc" },
  });

  return NextResponse.json(bomItems);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "merchant" && session.user.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const quote = await prisma.quote.findUnique({ where: { id } });
  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }
  if (session.user.role === "merchant" && quote.merchantId !== session.user.id) {
    return NextResponse.json({ error: "Not your quote" }, { status: 403 });
  }

  const body = await request.json();
  const { items } = body;

  // Delete existing items and recreate
  await prisma.bomItem.deleteMany({ where: { quoteId: id } });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const created = await Promise.all(
    items.map((item: any) =>
      prisma.bomItem.create({
        data: {
          quoteId: id,
          lineNumber: item.lineNumber,
          description: item.description,
          materialCategory: item.materialCategory,
          materialName: item.materialName || null,
          materialGrade: item.materialGrade || null,
          unit: item.unit,
          quantity: item.quantity,
          ratePerUnit: item.ratePerUnit,
          materialCost: item.quantity * item.ratePerUnit,
          laborCost: item.laborCost || 0,
          finishingCost: item.finishingCost || 0,
          hardwareCost: item.hardwareCost || 0,
          transportCost: item.transportCost || 0,
          marginPercent: item.marginPercent || 0,
          lineTotal: item.lineTotal,
          lengthValue: item.lengthValue ?? null,
          lengthUnit: item.lengthValue ? item.lengthUnit : null,
          widthValue: item.widthValue ?? null,
          widthUnit: item.widthValue ? item.widthUnit : null,
          heightValue: item.heightValue ?? null,
          heightUnit: item.heightValue ? item.heightUnit : null,
        },
      })
    )
  );

  return NextResponse.json(created);
}
