import { NextResponse, type NextRequest } from "next/server";
import { getInvoiceById } from "@/features/invoices/queries";
import { getSystemSettings } from "@/features/settings/queries";
import { buildBluetoothReceipt } from "@/features/invoices/bluetooth-receipt";
import { verifyInvoicePrintToken } from "@/lib/print-token";

export const dynamic = "force-dynamic";

const INVOICE_ID = /^[a-z0-9]{10,40}$/i;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}

/**
 * Response URL for the Android "Bluetooth Print" app (Browser Print). The
 * app requests it without the browser's session, so access is granted only
 * by the short-lived `?token=` issued for this exact invoice by
 * createBluetoothPrintLink — never publicly.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!INVOICE_ID.test(id)) return json({ error: "Invalid invoice id" }, 400);

  const tokenState = verifyInvoicePrintToken(id, request.nextUrl.searchParams.get("token"));
  if (tokenState === "expired") return json({ error: "Print link expired" }, 401);
  if (tokenState !== "ok") return json({ error: "Invalid print link" }, 401);

  try {
    const [invoice, settings] = await Promise.all([getInvoiceById(id), getSystemSettings()]);
    if (!settings.bluetoothPrint) return json({ error: "Bluetooth printing is disabled" }, 403);
    if (!invoice) return json({ error: "Invoice not found" }, 404);
    if (invoice.items.length === 0) return json({ error: "Invoice has no items" }, 422);

    return json(buildBluetoothReceipt({ invoice, settings, origin: request.nextUrl.origin }));
  } catch (error) {
    console.error("[bluetooth-print] failed to build receipt", error);
    return json({ error: "Could not build the receipt" }, 500);
  }
}
