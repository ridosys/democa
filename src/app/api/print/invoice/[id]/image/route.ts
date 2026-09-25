import { NextResponse, type NextRequest } from "next/server";
import { buildReceiptLines } from "@/features/invoices/bluetooth-receipt";
import { loadPrintRequest } from "@/features/invoices/print-request";
import { renderReceiptImage } from "@/features/invoices/receipt-image";

export const dynamic = "force-dynamic";
// Skia (@napi-rs/canvas) is a native module.
export const runtime = "nodejs";

const HEADERS = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

/** The receipt as a PNG for the printer app to print as a bitmap — how
 * Arabic receipts are printed (see receipt-image.ts). Same signed token as
 * the receipt JSON that links to it. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const result = await loadPrintRequest(id, request.nextUrl.searchParams.get("token"));
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status, headers: HEADERS });
    }

    const { lines, dir } = buildReceiptLines(result.invoice, result.settings);
    const png = renderReceiptImage(lines, { paper: result.settings.receiptPaperSize, dir });
    return new NextResponse(new Uint8Array(png), {
      headers: { ...HEADERS, "Content-Type": "image/png" },
    });
  } catch (error) {
    console.error("[bluetooth-print] failed to render receipt image", error);
    return NextResponse.json(
      { error: "Could not render the receipt" },
      { status: 500, headers: HEADERS },
    );
  }
}
