"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Pencil, Printer, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteCafeOrder, reopenCafeOrder } from "@/features/invoices/actions";
import { printInvoiceReceipt } from "@/features/invoices/print-receipt";
import { BluetoothPrintButton } from "@/features/invoices/components/bluetooth-print-button";
import { useLocale } from "@/i18n/locale-provider";
import { formatMessage } from "@/i18n/format";

/** Print / Edit / Delete for one checked-out order on the caisse orders
 * screen. Edit reopens the order (its invoice is reversed) and continues on
 * the regular table / takeaway order screen. */
export function CafeOrderActions({
  orderId,
  invoiceId,
  invoiceNumber,
  bluetoothPrint,
}: {
  orderId: string;
  invoiceId: string;
  invoiceNumber: string;
  /** Show the Bluetooth Print app button (settings toggle). */
  bluetoothPrint: boolean;
}) {
  const { t } = useLocale();
  const to = t.tables.caisse.orders;
  const router = useRouter();
  const [confirm, setConfirm] = useState<"edit" | "delete" | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    const action = confirm;
    startTransition(async () => {
      if (action === "edit") {
        const result = await reopenCafeOrder(orderId);
        if (result.error || !result.href) {
          toast.error(result.error ?? t.orders.notFoundError);
          setConfirm(null);
          return;
        }
        router.push(result.href);
        return;
      }
      if (action === "delete") {
        const result = await deleteCafeOrder(orderId);
        setConfirm(null);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success(to.deletedToast);
        router.refresh();
      }
    });
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="cursor-pointer"
          onClick={() => printInvoiceReceipt(invoiceId)}
        >
          <Printer className="size-4" />
          {to.printButton}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="cursor-pointer"
          onClick={() => setConfirm("edit")}
        >
          <Pencil className="size-4" />
          {to.editButton}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="cursor-pointer text-destructive hover:text-destructive"
          onClick={() => setConfirm("delete")}
        >
          <Trash2 className="size-4" />
          {to.deleteButton}
        </Button>
        {bluetoothPrint && (
          <BluetoothPrintButton invoiceId={invoiceId} className="col-span-3" />
        )}
      </div>

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && !isPending && setConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "delete" ? to.deleteConfirmTitle : to.editConfirmTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {formatMessage(
                confirm === "delete"
                  ? to.deleteConfirmDescription
                  : to.editConfirmDescription,
                { invoice: invoiceNumber },
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              variant={confirm === "delete" ? "destructive" : "default"}
              onClick={(e) => {
                e.preventDefault();
                handleConfirm();
              }}
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {confirm === "delete" ? to.deleteButton : to.editConfirmAction}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
