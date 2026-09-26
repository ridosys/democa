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
import { updateReceiptLanguage, updateReceiptTextSize } from "@/features/settings/actions";
import {
  DEFAULT_RECEIPT_TEXT_SIZE,
  RECEIPT_TEXT_SIZES,
  resolveReceiptTextSize,
  type ReceiptTextSize,
} from "@/lib/receipt-paper";
import {
  isReceiptLanguage,
  RECEIPT_LANGUAGES,
  type ReceiptLanguage,
} from "@/lib/receipt-style";

/** Saves a print setting as soon as it is picked; reverts on error. */
export function usePrintSetting<T>(
  initial: T,
  save: (value: T) => Promise<{ error?: string } | undefined>,
) {
  const t = useT();
  const router = useRouter();
  const [value, setValue] = useState<T>(initial);
  const [isPending, startTransition] = useTransition();

  function change(next: T) {
    if (next === value) return;
    const previous = value;
    setValue(next);
    startTransition(async () => {
      const result = await save(next);
      if (result?.error) {
        setValue(previous);
        toast.error(result.error);
        return;
      }
      toast.success(t.settings.printing.toastUpdated);
      router.refresh();
    });
  }

  return { value, change, isPending };
}

/** Default text size and language printed documents open with. */
export function PrintDefaultsForm({
  textSize,
  language,
}: {
  textSize: ReceiptTextSize;
  language: ReceiptLanguage;
}) {
  const t = useT();
  const tp = t.settings.printing;
  const size = usePrintSetting(textSize, updateReceiptTextSize);
  const lang = usePrintSetting(language, updateReceiptLanguage);

  return (
    <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label>{tp.defaultTextSizeLabel}</Label>
        <div className="flex items-center gap-2">
          <Select
            value={String(size.value)}
            disabled={size.isPending}
            onValueChange={(next) => size.change(resolveReceiptTextSize(next, size.value))}
          >
            <SelectTrigger className="w-full sm:w-60">
              <SelectValue>
                <span dir="ltr">{size.value}%</span>
                {size.value === DEFAULT_RECEIPT_TEXT_SIZE && ` (${tp.textSizeNormal})`}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {RECEIPT_TEXT_SIZES.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  <span dir="ltr">{option}%</span>
                  {option === DEFAULT_RECEIPT_TEXT_SIZE && ` (${tp.textSizeNormal})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {size.isPending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>
      </div>

      <div className="space-y-2">
        <Label>{tp.languageLabel}</Label>
        <div className="flex items-center gap-2">
          <Select
            value={lang.value}
            disabled={lang.isPending}
            onValueChange={(next) => isReceiptLanguage(next) && lang.change(next)}
          >
            <SelectTrigger className="w-full">
              <SelectValue>{tp.languageOptions[lang.value]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {RECEIPT_LANGUAGES.map((option) => (
                <SelectItem key={option} value={option}>
                  {tp.languageOptions[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {lang.isPending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>
        <p className="text-sm text-muted-foreground">{tp.languageDescription}</p>
      </div>
    </div>
  );
}
