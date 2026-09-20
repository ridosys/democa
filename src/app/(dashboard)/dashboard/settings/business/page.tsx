import { Store } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { getBusinessSettingsView } from "@/features/business/queries";
import { BusinessTypeForm } from "@/features/business/components/business-type-form";
import { FeaturePresetGrid } from "@/features/business/components/feature-preset-grid";
import { FeatureToggleList } from "@/features/business/components/feature-toggle-list";
import { requirePageAccess } from "@/lib/permissions";
import { requireBusinessSettingsManagementEnabled } from "@/lib/env-features";
import { getDictionary } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function BusinessSettingsPage() {
  await requirePageAccess("SETTINGS_MANAGE");
  requireBusinessSettingsManagementEnabled();

  const [t, { businessTypes, activeBusinessTypeId, features, presetsByBusinessType }] =
    await Promise.all([getDictionary(), getBusinessSettingsView()]);

  return (
    <div className="space-y-6">
      <PageHeader title={t.admin.business} icon={Store} />
      <Card>
        <CardHeader>
          <CardTitle>{t.settings.business.typeTitle}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t.settings.business.typeDescription}
          </p>
        </CardHeader>
        <CardContent>
          <BusinessTypeForm
            businessTypes={businessTypes}
            activeBusinessTypeId={activeBusinessTypeId}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t.settings.business.presetsTitle}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t.settings.business.presetsDescription}
          </p>
        </CardHeader>
        <CardContent>
          <FeaturePresetGrid
            businessTypes={businessTypes}
            presetsByBusinessType={presetsByBusinessType}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t.settings.business.featuresTitle}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t.settings.business.featuresDescription}
          </p>
        </CardHeader>
        <CardContent>
          <FeatureToggleList features={features} />
        </CardContent>
      </Card>
    </div>
  );
}
