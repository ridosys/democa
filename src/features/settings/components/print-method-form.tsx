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
import { updatePrintMethod } from "@/features/settings/actions";
import { isPrintMethod, PRINT_METHODS, type PrintMethod } from "@/lib/print-method";

/** Saves how receipts are printed as soon as a method is picked. */
export function PrintMethodForm({ method }: { method: PrintMethod }) {
  const t = useT();
  const tm = t.printMethod;
  const router = useRouter();
  const [value, setValue] = useState<PrintMethod>(method);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: string | null) {
    if (!isPrintMethod(next) || next === value) return;
    const previous = value;
    setValue(next);
    startTransition(async () => {
      const result = await updatePrintMethod(next);
      if (result?.error) {
        setValue(previous);
        toast.error(result.error);
        return;
      }
      toast.success(tm.toastUpdated);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2 border-t pt-4">
      <Label>{tm.label}</Label>
      <div className="flex items-center gap-2">
        <Select value={value} disabled={isPending} onValueChange={handleChange}>
          <SelectTrigger className="w-full sm:w-80">
            <SelectValue>{tm.options[value]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PRINT_METHODS.map((option) => (
              <SelectItem key={option} value={option}>
                {tm.options[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isPending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      </div>
      <p className="text-sm text-muted-foreground">{tm.descriptions[value]}</p>
    </div>
  );
}
