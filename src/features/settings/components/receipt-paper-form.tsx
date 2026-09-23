"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/i18n/locale-provider";
import { updateReceiptPaperSize } from "@/features/settings/actions";
import {
  isReceiptPaperSize,
  RECEIPT_PAPER_SIZES,
  type ReceiptPaperSize,
} from "@/lib/receipt-paper";

/** Saves the default receipt paper as soon as a size is picked. */
export function ReceiptPaperForm({ paper }: { paper: ReceiptPaperSize }) {
  const t = useT();
  const tp = t.settings.printing;
  const router = useRouter();
  const [value, setValue] = useState<ReceiptPaperSize>(paper);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: string | null) {
    if (!isReceiptPaperSize(next) || next === value) return;
    const previous = value;
    setValue(next);
    startTransition(async () => {
      const result = await updateReceiptPaperSize(next);
      if (result?.error) {
        setValue(previous);
        toast.error(result.error);
        return;
      }
      toast.success(tp.toastUpdated);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{tp.description}</p>
      <Label>{tp.paperLabel}</Label>
      <div className="flex items-center gap-2">
        <Select value={value} disabled={isPending} onValueChange={handleChange}>
          <SelectTrigger className="w-full sm:w-60">
            <SelectValue>{tp.options[value]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {RECEIPT_PAPER_SIZES.map((option) => (
              <SelectItem key={option} value={option}>
                {tp.options[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isPending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      </div>
    </div>
  );
}
