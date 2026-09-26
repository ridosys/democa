import { NextResponse, type NextRequest } from "next/server";
import { buildDocumentReceipt } from "@/features/print/receipt-documents";
import { loadPrintRequest, printOptionsFrom } from "@/features/print/print-request";
import { renderReceiptImage } from "@/features/invoices/receipt-image";

export const dynamic = "force-dynamic";
// Skia (@napi-rs/canvas) is a native module.
export const runtime = "nodejs";

const HEADERS = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

/** The receipt as a PNG for the printer app to print as a bitmap — how
 * Arabic / resized receipts are printed (see receipt-image.ts). Same signed
 * token as the receipt JSON that links to it. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kind: string; id: string }> },
) {
  const { kind, id } = await params;
  try {
    const { searchParams } = request.nextUrl;
    const result = await loadPrintRequest(kind, id, searchParams);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status, headers: HEADERS });
    }

    const built = await buildDocumentReceipt(result.ref, result.settings, printOptionsFrom(searchParams));
    if (!built.ok) {
      return NextResponse.json(
        { error: built.reason === "notFound" ? "Document not found" : "Document has no items" },
        { status: built.reason === "notFound" ? 404 : 422, headers: HEADERS },
      );
    }
    const { lines, paper, dir, textSize } = built.receipt;
    const png = renderReceiptImage(lines, { paper, dir, textSize });
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
