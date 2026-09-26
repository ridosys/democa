import { NextResponse, type NextRequest } from "next/server";
import { buildBluetoothReceipt } from "@/features/invoices/bluetooth-receipt";
import { buildDocumentReceipt } from "@/features/print/receipt-documents";
import { loadPrintRequest, printOptionsFrom } from "@/features/print/print-request";

export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}

/**
 * Response URL for the Android printer app (Thermer / Bluetooth Print,
 * "Browser Print"), for any printable document (invoice, purchase,
 * waiter-report). Access is checked by loadPrintRequest (signed,
 * short-lived token for this document only).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kind: string; id: string }> },
) {
  const { kind, id } = await params;
  try {
    const { origin, searchParams } = request.nextUrl;
    const result = await loadPrintRequest(kind, id, searchParams);
    if (!result.ok) return json({ error: result.error }, result.status);

    const built = await buildDocumentReceipt(result.ref, result.settings, printOptionsFrom(searchParams));
    if (!built.ok) {
      return built.reason === "notFound"
        ? json({ error: "Document not found" }, 404)
        : json({ error: "Document has no items" }, 422);
    }

    // Same query (token, date, lang, paper, text) for the image.
    const imageUrl = `${origin}/api/print/${kind}/${encodeURIComponent(id)}/image?${searchParams}`;
    return json(
      buildBluetoothReceipt({
        ...built.receipt,
        logoUrl: result.settings.logoUrl,
        origin,
        imageUrl,
      }),
    );
  } catch (error) {
    console.error("[bluetooth-print] failed to build receipt", error);
    return json({ error: "Could not build the receipt" }, 500);
  }
}
