"use client";

import { useTransition } from "react";
import { Bluetooth, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bluetoothPrintInvoice } from "@/features/invoices/bluetooth-print";
import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";

/** Prints an invoice on the thermal printer paired with the Android
 * "Bluetooth Print" app. Only rendered when the setting is enabled. */
export function BluetoothPrintButton({
  invoiceId,
  size = "sm",
  className,
}: {
  invoiceId: string;
  size?: "sm" | "default";
  className?: string;
}) {
  const t = useT();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      className={cn("cursor-pointer", className)}
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await bluetoothPrintInvoice(invoiceId, t.bluetoothPrint);
        })
      }
    >
      {isPending ? <Loader2 className="size-4 animate-spin" /> : <Bluetooth className="size-4" />}
      {t.bluetoothPrint.button}
    </Button>
  );
}
