import "server-only";
import { getInvoiceById } from "@/features/invoices/queries";
import { getSystemSettings, type SystemSettingsData } from "@/features/settings/queries";
import { verifyInvoicePrintToken } from "@/lib/print-token";

const INVOICE_ID = /^[a-z0-9]{10,40}$/i;

type Invoice = NonNullable<Awaited<ReturnType<typeof getInvoiceById>>>;

export type PrintRequestResult =
  | { ok: true; invoice: Invoice; settings: SystemSettingsData; token: string }
  | { ok: false; status: number; error: string };

/**
 * Access check shared by the printer-app endpoints (receipt JSON and its
 * image). The app calls them without the browser's session, so access is
 * granted only by the short-lived `?token=` issued for this exact invoice by
 * createBluetoothPrintLink — never publicly.
 */
export async function loadPrintRequest(
  id: string,
  token: string | null,
): Promise<PrintRequestResult> {
  if (!INVOICE_ID.test(id)) return { ok: false, status: 400, error: "Invalid invoice id" };

  const tokenState = verifyInvoicePrintToken(id, token);
  if (tokenState === "expired") return { ok: false, status: 401, error: "Print link expired" };
  if (tokenState !== "ok" || !token) {
    return { ok: false, status: 401, error: "Invalid print link" };
  }

  const [invoice, settings] = await Promise.all([getInvoiceById(id), getSystemSettings()]);
  if (settings.printMethod !== "thermer") {
    return { ok: false, status: 403, error: "Printer app printing is disabled" };
  }
  if (!invoice) return { ok: false, status: 404, error: "Invoice not found" };
  if (invoice.items.length === 0) return { ok: false, status: 422, error: "Invoice has no items" };

  return { ok: true, invoice, settings, token };
}
