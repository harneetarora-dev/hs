import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { formatDate, formatINR } from "@/lib/format";
import { COMPANY, DEFAULT_TERMS } from "@/lib/company";
import PrintButton from "./PrintButton";

export default async function QuotePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      lead: { select: { clientName: true, clientPhone: true, clientEmail: true } },
      customer: true,
      merchant: { select: { name: true, phone: true } },
      bomItems: { orderBy: { lineNumber: "asc" } },
    },
  });

  if (!quote) notFound();

  const subtotal = quote.bomItems.reduce((sum, item) => sum + Number(item.lineTotal), 0);
  const gstAmount = subtotal * (Number(quote.taxRate) / 100);
  let discount = 0;
  if (quote.discountType === "percentage") {
    discount = subtotal * (Number(quote.discountValue) / 100);
  } else if (quote.discountType === "fixed") {
    discount = Number(quote.discountValue);
  }
  const grandTotal = subtotal + gstAmount - discount;
  const displayNumber = `${quote.quoteNumber}-V${quote.currentVersion}`;
  const customerName = quote.customer?.name || quote.lead.clientName;
  const customerPhone = quote.customer?.phone || quote.lead.clientPhone;
  const customerEmail = quote.customer?.email || quote.lead.clientEmail;

  return (
    <div className="max-w-4xl mx-auto print:max-w-none print:m-0 print:p-0">
      <PrintButton />

      <div className="bg-white print:bg-white p-8 print:p-6">
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-gray-800 pb-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{COMPANY.name}</h1>
            <p className="text-xs text-gray-600 mt-0.5">GSTN: {COMPANY.gstn}</p>
            <p className="text-xs text-gray-600 mt-1">
              {COMPANY.office.address}, {COMPANY.office.city} - {COMPANY.office.pincode}
            </p>
            <p className="text-xs text-gray-600">
              {COMPANY.factory.address}, {COMPANY.factory.city} - {COMPANY.factory.pincode}
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold text-gray-900">QUOTATION</h2>
            <p className="text-sm font-semibold text-gray-800 mt-1">{displayNumber}</p>
            <p className="text-xs text-gray-600 mt-1">Date: {formatDate(quote.createdAt)}</p>
          </div>
        </div>

        {/* Bill To */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Bill To:</p>
          <p className="text-sm font-semibold text-gray-900 mt-1">{customerName}</p>
          {quote.customer?.companyName && (
            <p className="text-xs text-gray-600">{quote.customer.companyName}</p>
          )}
          {customerPhone && <p className="text-xs text-gray-600">{customerPhone}</p>}
          {customerEmail && <p className="text-xs text-gray-600">{customerEmail}</p>}
          {quote.customer?.address && (
            <p className="text-xs text-gray-600">
              {quote.customer.address}
              {quote.customer.city && `, ${quote.customer.city}`}
              {quote.customer.pincode && ` - ${quote.customer.pincode}`}
            </p>
          )}
          {quote.customer?.gstn && (
            <p className="text-xs text-gray-600">GSTN: {quote.customer.gstn}</p>
          )}
        </div>

        {/* Items Table */}
        <table className="w-full text-sm border-collapse mb-6">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 w-10">S.No</th>
              <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 w-24">SKU</th>
              <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Description</th>
              <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700 w-16">Qty</th>
              <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700 w-14">Unit</th>
              <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 w-28">Rate</th>
              <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 w-28">Amount</th>
            </tr>
          </thead>
          <tbody>
            {quote.bomItems.map((item) => (
              <tr key={item.id}>
                <td className="border border-gray-300 px-3 py-2 text-gray-600">{item.lineNumber}</td>
                <td className="border border-gray-300 px-3 py-2 text-gray-600 font-mono text-xs">
                  {item.productCode || "—"}
                </td>
                <td className="border border-gray-300 px-3 py-2">
                  <span className="text-gray-900">{item.description}</span>
                  {item.notes && <span className="text-xs text-gray-500 block mt-0.5">{item.notes}</span>}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-center text-gray-600">
                  {Number(item.quantity)}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-center text-gray-600 text-xs">
                  {unitLabel(item.unit)}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right text-gray-600">
                  {formatINR(Number(item.ratePerUnit))}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right font-medium text-gray-900">
                  {formatINR(Number(item.lineTotal))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-72">
            <div className="flex justify-between py-1.5 text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium text-gray-900">{formatINR(subtotal)}</span>
            </div>
            <div className="flex justify-between py-1.5 text-sm">
              <span className="text-gray-600">GST ({Number(quote.taxRate)}%)</span>
              <span className="font-medium text-gray-900">{formatINR(gstAmount)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between py-1.5 text-sm">
                <span className="text-gray-600">Discount</span>
                <span className="font-medium text-red-600">-{formatINR(discount)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 text-sm font-bold border-t-2 border-gray-800 mt-1">
              <span className="text-gray-900">Grand Total</span>
              <span className="text-gray-900">{formatINR(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Terms & Bank Details */}
        <div className="grid grid-cols-2 gap-8 border-t border-gray-300 pt-6">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Terms & Conditions
            </h3>
            <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
              {quote.notesToClient || DEFAULT_TERMS}
            </p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Bank Details
            </h3>
            <div className="text-xs text-gray-600 space-y-0.5">
              <p>Account: {COMPANY.bank.accountName}</p>
              <p>A/C No.: {COMPANY.bank.accountNumber}</p>
              <p>IFSC: {COMPANY.bank.ifsc}</p>
              <p>Bank: {COMPANY.bank.name}</p>
            </div>
          </div>
        </div>

        {/* Signature */}
        <div className="mt-12 flex justify-between items-end">
          <div className="text-xs text-gray-500">
            <p>Prepared by: {quote.merchant.name}</p>
          </div>
          <div className="text-center">
            <div className="w-48 border-t border-gray-400 pt-1">
              <p className="text-xs text-gray-500">Authorized Signatory</p>
              <p className="text-xs font-semibold text-gray-700">{COMPANY.name}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function unitLabel(unit: string): string {
  const labels: Record<string, string> = {
    piece: "Pcs",
    sq_ft: "Sq.ft",
    cu_ft: "Cu.ft",
    running_ft: "Rft",
    kg: "Kg",
    litre: "Ltr",
    set: "Set",
  };
  return labels[unit] || unit;
}
