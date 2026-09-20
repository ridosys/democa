"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { updateFeatureDefault } from "@/features/business/actions";
import { FEATURE_KEYS, type FeatureKey } from "@/lib/feature-catalog";
import { useLocale } from "@/i18n/locale-provider";
import type { BusinessTypeRow } from "@/features/business/queries";

/**
 * Every business type's stored preset, editable directly — the
 * admin-facing replacement for what used to be a hardcoded
 * BUSINESS_TYPE_PRESETS map in code. Rows are the fixed FEATURE_KEYS
 * catalog (each one wired to real gating elsewhere in the app); columns
 * are whatever business types currently exist, including ones the admin
 * added themselves.
 */
export function FeaturePresetGrid({
  businessTypes,
  presetsByBusinessType,
}: {
  businessTypes: BusinessTypeRow[];
  presetsByBusinessType: Record<string, Record<FeatureKey, boolean>>;
}) {
  const [isPending, startTransition] = useTransition();
  const { t } = useLocale();

  function handleToggle(businessTypeId: string, key: FeatureKey, enabled: boolean) {
    startTransition(async () => {
      const result = await updateFeatureDefault({ businessTypeId, key, enabled });
      if (result.error) toast.error(result.error);
    });
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr>
            <th className="p-2 text-start font-medium text-muted-foreground"></th>
            {businessTypes.map((businessType) => (
              <th
                key={businessType.id}
                className="p-2 text-center font-medium text-muted-foreground"
              >
                {businessType.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FEATURE_KEYS.map((key) => (
            <tr key={key} className="border-t">
              <td className="p-2 font-medium">{t.settings.business.features[key].label}</td>
              {businessTypes.map((businessType) => (
                <td key={businessType.id} className="p-2 text-center">
                  <Switch
                    checked={presetsByBusinessType[businessType.id]?.[key] ?? false}
                    disabled={isPending}
                    onCheckedChange={(checked) =>
                      handleToggle(businessType.id, key, checked)
                    }
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
