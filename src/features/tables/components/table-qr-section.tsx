"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { Loader2, Printer, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  enableTableQr,
  disableTableQr,
  regenerateTableQr,
} from "@/features/tables/actions";
import { useLocale } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";

export function TableQrSection({
  tableId,
  qrToken,
  qrEnabled,
  origin,
  bare = false,
}: {
  tableId: string;
  qrToken: string | null;
  qrEnabled: boolean;
  /** The request's own origin (from the server, e.g. via
   * getRequestOrigin()) — used instead of window.location.origin so this
   * renders identically on the server, avoiding a hydration mismatch on
   * pages where this isn't gated behind client-only open state. */
  origin: string;
  /** Drops the top border/margin meant to separate this from preceding
   * form content — set when embedding this directly in a Dialog with
   * nothing above it. */
  bare?: boolean;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const [isPending, startTransition] = useTransition();
  const [enabled, setEnabled] = useState(qrEnabled);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const orderUrl = qrToken ? `${origin}/order/${qrToken}` : null;

  function handleToggle(next: boolean) {
    setEnabled(next);
    startTransition(async () => {
      const result = next ? await enableTableQr(tableId) : await disableTableQr(tableId);
      if (result.error) {
        toast.error(result.error);
        setEnabled(!next);
        return;
      }
      router.refresh();
    });
  }

  function handleRegenerate() {
    startTransition(async () => {
      const result = await regenerateTableQr(tableId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setConfirmOpen(false);
      toast.success(t.tables.qr.regenerateSuccessToast);
      router.refresh();
    });
  }

  return (
    <div className={cn("space-y-3", !bare && "mt-4 border-t pt-4")}>
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <Label htmlFor="table-qr-enabled">{t.tables.qr.enableLabel}</Label>
          <p className="text-xs text-muted-foreground">{t.tables.qr.enableDescription}</p>
        </div>
        <Switch
          id="table-qr-enabled"
          checked={enabled}
          disabled={isPending}
          onCheckedChange={handleToggle}
        />
      </div>

      {enabled && orderUrl && (
        <div className="flex flex-col items-center gap-3 rounded-lg border p-4">
          <QRCodeSVG value={orderUrl} size={140} />
          <p className="break-all text-center text-xs text-muted-foreground">{orderUrl}</p>
          <div className="flex w-full gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 cursor-pointer"
              nativeButton={false}
              render={
                <a href={`/dashboard/tables/${tableId}/qr-card`} target="_blank" rel="noreferrer" />
              }
            >
              <Printer className="size-4" />
              {t.tables.qr.printButton}
            </Button>
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 cursor-pointer"
                    disabled={isPending}
                  >
                    <RefreshCw className="size-4" />
                    {t.tables.qr.regenerateButton}
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t.tables.qr.regenerateButton}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t.tables.qr.regenerateConfirmDescription}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                  <AlertDialogAction disabled={isPending} onClick={handleRegenerate}>
                    {isPending && <Loader2 className="size-4 animate-spin" />}
                    {t.tables.qr.regenerateButton}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}
    </div>
  );
}
