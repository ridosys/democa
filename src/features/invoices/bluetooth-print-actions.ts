"use server";

import { prisma } from "@/lib/prisma";
import { hasAnyPermission } from "@/lib/permissions";
import { createInvoicePrintToken } from "@/lib/print-token";
import { getSystemSettings } from "@/features/settings/queries";
import { getDictionary } from "@/i18n/server";

/**
 * Issues a short-lived signed response URL (a path — the browser prefixes
 * its own origin, which is the address the Android device can reach) for
 * the Bluetooth Print app to fetch one invoice's receipt JSON. Same access
 * as the print pages: POS cashiers or invoice viewers.
 */
export async function createBluetoothPrintLink(
  invoiceId: unknown,
): Promise<{ path: string } | { error: string }> {
  const t = await getDictionary();
  if (!(await hasAnyPermission(["POS_VIEW", "INVOICES_VIEW"]))) {
    return { error: t.common.insufficientPermissionError };
  }
  if (typeof invoiceId !== "string" || !/^[a-z0-9]{10,40}$/i.test(invoiceId)) {
    return { error: t.bluetoothPrint.linkError };
  }

  const [settings, invoice] = await Promise.all([
    getSystemSettings(),
    prisma.invoice.findUnique({ where: { id: invoiceId }, select: { id: true } }),
  ]);
  if (!settings.bluetoothPrint) return { error: t.bluetoothPrint.disabledError };
  if (!invoice) return { error: t.bluetoothPrint.notFoundError };

  const token = createInvoicePrintToken(invoice.id);
  return {
    path: `/api/print/invoice/${encodeURIComponent(invoice.id)}?token=${encodeURIComponent(token)}`,
  };
}
