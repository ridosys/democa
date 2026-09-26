import { NextResponse, type NextRequest } from "next/server";
import { buildBluetoothReceipt } from "@/features/invoices/bluetooth-receipt";
import { loadPrintRequest } from "@/features/invoices/print-request";

export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}

/**
 * Response URL for the Android printer app (Thermer / Bluetooth Print,
 * "Browser Print"). Access is checked by loadPrintRequest (signed,
 * short-lived token for this invoice only).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const result = await loadPrintRequest(id, request.nextUrl.searchParams.get("token"));
    if (!result.ok) return json({ error: result.error }, result.status);

    const { origin, searchParams } = request.nextUrl;
    const options = {
      lang: searchParams.get("lang") ?? undefined,
      paper: searchParams.get("paper") ?? undefined,
      textSize: searchParams.get("text") ?? undefined,
    };
    const imageQuery = new URLSearchParams({ token: result.token });
    if (options.lang) imageQuery.set("lang", options.lang);
    if (options.paper) imageQuery.set("paper", options.paper);
    if (options.textSize) imageQuery.set("text", options.textSize);
    const imageUrl = `${origin}/api/print/invoice/${encodeURIComponent(id)}/image?${imageQuery}`;
    return json(
      buildBluetoothReceipt({
        invoice: result.invoice,
        settings: result.settings,
        origin,
        imageUrl,
        options,
      }),
    );
  } catch (error) {
    console.error("[bluetooth-print] failed to build receipt", error);
    return json({ error: "Could not build the receipt" }, 500);
  }
}
