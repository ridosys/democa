"use client";

import { useTransition } from "react";
import { Bluetooth, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  bluetoothPrintInvoice,
  escposPrintInvoice,
} from "@/features/invoices/bluetooth-print";
import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import type { PrintMethod } from "@/lib/print-method";

/** Prints an invoice straight on the Android printer app chosen in
 * settings (Thermer or Open ESC/POS Print Service). Renders nothing when
 * receipts are printed with the browser dialog. */
export function BluetoothPrintButton({
  invoiceId,
  method,
  size = "sm",
  variant = "outline",
  className,
}: {
  invoiceId: string;
  method: PrintMethod;
  size?: "sm" | "default";
  variant?: "outline" | "default";
  className?: string;
}) {
  const t = useT();
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
          if (method === "escpos") await escposPrintInvoice(invoiceId, t.escposPrint);
          else await bluetoothPrintInvoice(invoiceId, t.bluetoothPrint);
        })
      }
    >
      {isPending ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
      {method === "escpos" ? t.escposPrint.button : t.bluetoothPrint.button}
    </Button>
  );
}
