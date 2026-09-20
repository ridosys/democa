"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { updateFeatureOverride, resetFeatureOverrides } from "@/features/business/actions";
import { useLocale } from "@/i18n/locale-provider";
import type { FeatureRow } from "@/features/business/queries";

export function FeatureToggleList({ features }: { features: FeatureRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [resetOpen, setResetOpen] = useState(false);
  const { t } = useLocale();

  const hasOverrides = features.some((feature) => feature.isOverridden);

  function handleToggle(key: FeatureRow["key"], enabled: boolean) {
    startTransition(async () => {
      const result = await updateFeatureOverride({ key, enabled });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t.settings.business.toastFeatureUpdated);
    });
  }

  function handleReset() {
    startTransition(async () => {
      const result = await resetFeatureOverrides();
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setResetOpen(false);
      toast.success(t.settings.business.toastReset);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
          <AlertDialogTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer"
                disabled={isPending || !hasOverrides}
              >
                <RotateCcw className="size-4" />
                {t.settings.business.resetButton}
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.settings.business.resetButton}</AlertDialogTitle>
              <AlertDialogDescription>
                {t.settings.business.resetConfirmDescription}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
              <AlertDialogAction disabled={isPending} onClick={handleReset}>
                {t.settings.business.resetButton}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {features.map((feature) => {
        const labels = t.settings.business.features[feature.key];
        return (
          <div
            key={feature.key}
            className="flex items-start justify-between gap-4 rounded-lg border p-3"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label>{labels.label}</Label>
                {feature.isOverridden && (
                  <Badge variant="outline" className="text-xs">
                    {t.settings.business.overriddenBadge}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {labels.description}
              </p>
            </div>
            <Switch
              checked={feature.enabled}
              disabled={isPending}
              onCheckedChange={(checked) => handleToggle(feature.key, checked)}
            />
          </div>
        );
      })}
    </div>
  );
}
