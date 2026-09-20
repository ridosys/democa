"use client";

import { useState } from "react";
import { QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TableQrSection } from "@/features/tables/components/table-qr-section";
import { useLocale } from "@/i18n/locale-provider";

/** Quick access to a table's QR code straight from its card — no need to
 * open the full edit sheet just to view/print/regenerate it. Reuses
 * TableQrSection as-is (enable toggle included), so the dialog also works
 * for a table that hasn't turned QR ordering on yet. */
export function TableQrDialogButton({
  tableId,
  tableName,
  qrToken,
  qrEnabled,
  origin,
}: {
  tableId: string;
  tableName: string;
  qrToken: string | null;
  qrEnabled: boolean;
  origin: string;
}) {
  const [open, setOpen] = useState(false);
  const { t } = useLocale();

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className="cursor-pointer"
        aria-label={t.tables.qr.viewButton}
        onClick={() => setOpen(true)}
      >
        <QrCode className="size-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tableName}</DialogTitle>
          </DialogHeader>
          <TableQrSection
            tableId={tableId}
            qrToken={qrToken}
            qrEnabled={qrEnabled}
            origin={origin}
            bare
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
