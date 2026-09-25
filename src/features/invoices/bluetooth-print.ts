import { toast } from "sonner";
import {
  createBluetoothPrintLink,
  createEscposPrintIntent,
} from "@/features/invoices/bluetooth-print-actions";
import { printInvoiceReceipt } from "@/features/invoices/print-receipt";
import type { Dictionary } from "@/i18n/dictionaries";
import type { PrintMethod } from "@/lib/print-method";

/** Thermer / Bluetooth Print app's Browser Print URL scheme. */
export const BLUETOOTH_PRINT_SCHEME = "my.bluetoothprint.scheme://";

// If the page is still in the foreground this long after launching the
// app, it most likely isn't installed (or this isn't Android).
const APP_LAUNCH_TIMEOUT_MS = 2500;

export type BluetoothPrintMessages = {
  linkError: string;
  notInstalled: string;
};

/** Printer-app messages for whichever method is configured. */
export type PrinterAppMessages = Pick<Dictionary, "bluetoothPrint" | "escposPrint">;

function launchApp(url: string, notInstalled: string) {
  let left = false;
  const onLeave = () => {
    left = true;
  };
  const onVisibility = () => {
    if (document.visibilityState === "hidden") left = true;
  };
  window.addEventListener("blur", onLeave);
  window.addEventListener("pagehide", onLeave);
  document.addEventListener("visibilitychange", onVisibility);

  setTimeout(() => {
    window.removeEventListener("blur", onLeave);
    window.removeEventListener("pagehide", onLeave);
    document.removeEventListener("visibilitychange", onVisibility);
    if (!left) toast.warning(notInstalled);
  }, APP_LAUNCH_TIMEOUT_MS);

  window.location.href = url;
}

/**
 * Sends one invoice to the thermal printer through the Thermer / Bluetooth
 * Print app: fetches a signed, short-lived response URL for it, then opens
 * `my.bluetoothprint.scheme://<response URL>`; the app downloads the receipt
 * JSON from that URL and prints it. Returns false (after a toast) on failure.
 */
export async function bluetoothPrintInvoice(
  invoiceId: string,
  messages: BluetoothPrintMessages,
): Promise<boolean> {
  let result: Awaited<ReturnType<typeof createBluetoothPrintLink>>;
  try {
    result = await createBluetoothPrintLink(invoiceId);
  } catch {
    toast.error(messages.linkError);
    return false;
  }
  if ("error" in result) {
    toast.error(result.error);
    return false;
  }

  const responseUrl = `${window.location.origin}${result.path}`;
  launchApp(`${BLUETOOTH_PRINT_SCHEME}${responseUrl}`, messages.notInstalled);
  return true;
}

/**
 * Prints one invoice straight on the default printer of the "Open ESC/POS
 * Print Service" app, through its `print-intent` intent (the receipt HTML
 * is inside the intent URL). Returns false (after a toast) on failure.
 */
export async function escposPrintInvoice(
  invoiceId: string,
  messages: PrinterAppMessages["escposPrint"],
): Promise<boolean> {
  let result: Awaited<ReturnType<typeof createEscposPrintIntent>>;
  try {
    result = await createEscposPrintIntent(invoiceId);
  } catch {
    toast.error(messages.buildError);
    return false;
  }
  if ("error" in result) {
    toast.error(result.error);
    return false;
  }
  launchApp(result.url, messages.notInstalled);
  return true;
}

/** Prints an invoice with the method chosen in settings: the browser print
 * dialog, the Thermer app or the Open ESC/POS Print Service app. */
export function printInvoiceWith(
  method: PrintMethod,
  invoiceId: string,
  messages: PrinterAppMessages,
) {
  if (method === "escpos") void escposPrintInvoice(invoiceId, messages.escposPrint);
  else if (method === "thermer") void bluetoothPrintInvoice(invoiceId, messages.bluetoothPrint);
  else printInvoiceReceipt(invoiceId);
}

/** Automatic receipt after a checkout, with the method chosen in settings. */
export const autoPrintInvoiceReceipt = printInvoiceWith;
