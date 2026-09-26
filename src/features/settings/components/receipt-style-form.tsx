"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import { updateReceiptStyle } from "@/features/settings/actions";
import { usePrintSetting } from "@/features/settings/components/print-defaults-form";
import { RECEIPT_STYLES, type ReceiptStyle } from "@/lib/receipt-style";

/** Picks the design of every printed document. Each design is a small
 * thumbnail of a sample invoice (rendered on the server); clicking one
 * opens it in full, and it only becomes the active design once confirmed. */
export function ReceiptStyleForm({
  style,
  previews,
}: {
  style: ReceiptStyle;
  previews: Record<ReceiptStyle, React.ReactNode>;
}) {
  const t = useT();
  const tp = t.settings.printing;
  const setting = usePrintSetting(style, updateReceiptStyle);
  const [open, setOpen] = useState(false);
  // Stays set while the dialog animates closed, so its content doesn't vanish.
  const [shown, setShown] = useState<ReceiptStyle>(style);

  function preview(option: ReceiptStyle) {
    setShown(option);
    setOpen(true);
  }

  function confirm() {
    setting.change(shown);
    setOpen(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">
          {tp.stylesDescription} {tp.stylePreviewHint}
        </p>
        {setting.isPending && (
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
        )}
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-3 sm:max-w-2xl">
        {RECEIPT_STYLES.map((option) => {
          const active = setting.value === option;
          return (
            <button
              key={option}
              type="button"
              aria-label={tp.styleNames[option]}
              aria-current={active || undefined}
              onClick={() => preview(option)}
              className={cn(
                "flex cursor-pointer flex-col overflow-hidden rounded-lg border-2 bg-card text-start transition-colors",
                active
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-border hover:border-primary/50",
              )}
            >
              {/* Thumbnail: the top of the receipt, scaled down. */}
              <div className="pointer-events-none relative h-44 w-full overflow-hidden bg-muted/50">
                <div className="absolute top-2 left-1/2 origin-top -translate-x-1/2 scale-50">
                  {previews[option]}
                </div>
                <div className="absolute inset-x-0 bottom-0 h-8 bg-linear-to-t from-card to-transparent" />
              </div>
              <div className="flex items-center justify-between gap-2 border-t px-2.5 py-1.5">
                <span className="min-w-0 text-xs font-medium wrap-break-word">
                  {tp.styleNames[option]}
                </span>
                {active && (
                  <span
                    className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                    title={tp.styleCurrent}
                  >
                    <Check className="size-3" />
                    <span className="sr-only">{tp.styleCurrent}</span>
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {tp.styleNames[shown]}
              {setting.value === shown && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {tp.styleCurrent}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {/* The full receipt, a bit larger than the thumbnails. */}
          <div className="-mx-4 max-h-[65vh] overflow-y-auto bg-muted/50 p-4">
            <div className="flex justify-center [zoom:1.25]">{previews[shown]}</div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>{t.common.cancel}</DialogClose>
            <Button
              type="button"
              disabled={setting.value === shown || setting.isPending}
              onClick={confirm}
            >
              <Check className="size-4" />
              {setting.value === shown ? tp.styleCurrent : tp.styleUse}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
