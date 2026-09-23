"use client";

import { useEffect } from "react";

export const RECEIPT_PRINTED_MESSAGE = "receipt-printed";

/**
 * Rendered on the invoice print page when it is opened with `?autoprint=1`
 * — normally inside the hidden iframe `printInvoiceReceipt` creates. Waits
 * until the receipt is fully laid out (fonts, logo image, and the thermal
 * page height ReceiptPaper measures after mount), opens the print dialog,
 * then tells the parent window it can drop the iframe.
 */
export function AutoPrint() {
  useEffect(() => {
    let cancelled = false;

    function notifyParent() {
      if (window.parent !== window) {
        window.parent.postMessage(RECEIPT_PRINTED_MESSAGE, window.location.origin);
      }
    }

    async function run() {
      await document.fonts?.ready;
      await Promise.all(
        Array.from(document.images)
          .filter((img) => !img.complete)
          .map(
            (img) =>
              new Promise<void>((resolve) => {
                img.addEventListener("load", () => resolve(), { once: true });
                img.addEventListener("error", () => resolve(), { once: true });
              }),
          ),
      );
      // Let ReceiptPaper's ResizeObserver write the final @page height.
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (cancelled) return;
      window.addEventListener("afterprint", notifyParent, { once: true });
      window.print();
    }

    void run();
    return () => {
      cancelled = true;
      window.removeEventListener("afterprint", notifyParent);
    };
  }, []);

  return null;
}
