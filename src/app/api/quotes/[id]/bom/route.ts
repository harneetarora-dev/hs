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

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: { bomItems: { orderBy: { lineNumber: "asc" } } },
  });
  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }
  if (session.user.role === "merchant" && quote.merchantId !== session.user.id) {
    return NextResponse.json({ error: "Not your quote" }, { status: 403 });
  }

  const body = await request.json();
  const { items, changeSummary } = body;

  const snapshotData = {
    bomItems: quote.bomItems.map((item) => ({
      lineNumber: item.lineNumber,
      productCode: item.productCode,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      ratePerUnit: item.ratePerUnit,
      lineTotal: item.lineTotal,
      notes: item.notes,
      imageUrl: item.imageUrl,
      drawingUrl: item.drawingUrl,
    })),
    taxRate: quote.taxRate,
    discountType: quote.discountType,
    discountValue: quote.discountValue,
  };

  await prisma.bomItem.deleteMany({ where: { quoteId: id } });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const created = await Promise.all(
    items.map((item: any) =>
      prisma.bomItem.create({
        data: {
          quoteId: id,
          lineNumber: item.lineNumber,
          description: item.description,
          productCode: item.productCode || null,
          unit: item.unit || "piece",
          quantity: item.quantity,
          ratePerUnit: item.ratePerUnit,
          materialCost: 0,
          lineTotal: item.lineTotal,
          notes: item.notes || null,
          imageUrl: item.imageUrl || null,
          drawingUrl: item.drawingUrl || null,
        },
      })
    )
  );

  const newVersion = quote.currentVersion + 1;
  await prisma.quoteVersion.create({
    data: {
      quoteId: id,
      versionNumber: newVersion,
      changeSummary: changeSummary || `Updated to V${newVersion}`,
      createdById: session.user.id,
      snapshotData,
    },
  });

  await prisma.quote.update({
    where: { id },
    data: { currentVersion: newVersion },
  });

  return NextResponse.json(created);
}
