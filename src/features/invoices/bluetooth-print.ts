import { toast } from "sonner";
import { createBluetoothPrintLink } from "@/features/invoices/bluetooth-print-actions";
import { printInvoiceReceipt } from "@/features/invoices/print-receipt";

/** Android "Bluetooth Print" app's Browser Print URL scheme. */
export const BLUETOOTH_PRINT_SCHEME = "my.bluetoothprint.scheme://";

// If the page is still in the foreground this long after launching the
// scheme, the app most likely isn't installed (or this isn't Android).
const APP_LAUNCH_TIMEOUT_MS = 2500;

export type BluetoothPrintMessages = {
  linkError: string;
  notInstalled: string;
};

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
 * Sends one invoice to the thermal printer through the Bluetooth Print app:
 * fetches a signed, short-lived response URL for it, then opens
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

/** Automatic receipt after a checkout: through Bluetooth Print when it's
 * enabled in settings, otherwise the regular browser print dialog. */
export function autoPrintInvoiceReceipt(
  invoiceId: string,
  bluetoothPrint: boolean,
  messages: BluetoothPrintMessages,
) {
  if (bluetoothPrint) void bluetoothPrintInvoice(invoiceId, messages);
  else printInvoiceReceipt(invoiceId);
}
