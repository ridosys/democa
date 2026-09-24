"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/i18n/locale-provider";
import { updateBluetoothPrint } from "@/features/settings/actions";

/** Saves the Bluetooth Print on/off setting as soon as it's toggled. */
export function BluetoothPrintForm({ enabled }: { enabled: boolean }) {
  const t = useT();
  const tb = t.bluetoothPrint;
  const router = useRouter();
  const [value, setValue] = useState(enabled);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: boolean) {
    const previous = value;
    setValue(next);
    startTransition(async () => {
      const result = await updateBluetoothPrint(next);
      if (result?.error) {
        setValue(previous);
        toast.error(result.error);
        return;
      }
      toast.success(next ? tb.toastEnabled : tb.toastDisabled);
      router.refresh();
    });
  }

  return (
    <div className="flex items-start justify-between gap-4 border-t pt-4">
      <div className="space-y-1">
        <Label htmlFor="bluetooth-print">{tb.settingLabel}</Label>
        <p className="text-sm text-muted-foreground">{tb.settingDescription}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {isPending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        <Switch
          id="bluetooth-print"
          checked={value}
          disabled={isPending}
          onCheckedChange={handleChange}
        />
      </div>
    </div>
  );
}
