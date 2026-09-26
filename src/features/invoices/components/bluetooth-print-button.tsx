"use client";

import { useTransition } from "react";
import { Bluetooth, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGoBack } from "@/components/shared/back-button";
import {
  bluetoothPrintInvoice,
  escposPrintInvoice,
} from "@/features/invoices/bluetooth-print";
import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import { waitUntilPageReturns } from "@/lib/page-return";
import type { PrintMethod, ReceiptPrintOptions } from "@/lib/print-method";

/** Prints an invoice straight on the Android printer app chosen in
 * settings (Thermer or Open ESC/POS Print Service). Renders nothing when
 * receipts are printed with the browser dialog. */
export function BluetoothPrintButton({
  invoiceId,
  method,
  size = "sm",
  variant = "outline",
  className,
  options,
  backHref,
}: {
  invoiceId: string;
  method: PrintMethod;
  /** Language / paper shown on the print page, printed the same way. */
  options?: ReceiptPrintOptions;
  size?: "sm" | "default";
  variant?: "outline" | "default";
  className?: string;
  /** When set, goes back to the previous page (or here, without history)
   * once the printer app was opened and the user is back on this page. */
  backHref?: string;
}) {
  const t = useT();
  const goBack = useGoBack(backHref ?? "/");
  const [isPending, startTransition] = useTransition();
  if (method === "browser") return null;

  const Icon = method === "escpos" ? Printer : Bluetooth;
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn("cursor-pointer", className)}
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const opened =
            method === "escpos"
              ? await escposPrintInvoice(invoiceId, t.escposPrint, options)
              : await bluetoothPrintInvoice(invoiceId, t.bluetoothPrint, options);
          if (opened && backHref) {
            await waitUntilPageReturns(0);
            goBack();
          }
        })
      }
    >
      {isPending ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
      {method === "escpos" ? t.escposPrint.button : t.bluetoothPrint.button}
    </Button>
  );
}
