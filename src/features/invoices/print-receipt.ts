import { RECEIPT_PRINTED_MESSAGE } from "@/features/invoices/components/auto-print";

// Safety net in case "afterprint" never reaches us (tab closed, browser quirk).
const IFRAME_MAX_LIFETIME_MS = 10 * 60 * 1000;

/**
 * Prints an invoice receipt without leaving the current screen: loads the
 * print page (with `?autoprint=1`) in an off-screen iframe, which opens the
 * print dialog by itself once the receipt is ready.
 *
 * The iframe is attached straight to <body>, outside React, so it survives
 * the caller navigating away (e.g. back to the tables screen) while the
 * print dialog is still open.
 */
export function printInvoiceReceipt(invoiceId: string) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.tabIndex = -1;
  Object.assign(iframe.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: "800px",
    height: "1200px",
    border: "0",
  });

  function cleanup() {
    clearTimeout(timeout);
    window.removeEventListener("message", onMessage);
    iframe.remove();
  }
  function onMessage(event: MessageEvent) {
    if (
      event.source === iframe.contentWindow &&
      event.origin === window.location.origin &&
      event.data === RECEIPT_PRINTED_MESSAGE
    ) {
      cleanup();
    }
  }

  const timeout = setTimeout(cleanup, IFRAME_MAX_LIFETIME_MS);
  window.addEventListener("message", onMessage);
  iframe.src = `/caisse/invoices/${encodeURIComponent(invoiceId)}/print?autoprint=1`;
  document.body.appendChild(iframe);
}
