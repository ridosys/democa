import { Palette } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { getSystemSettings } from "@/features/settings/queries";
import { AppearanceForm } from "@/features/settings/components/appearance-form";
import { CompanyLogoForm } from "@/features/settings/components/company-logo-form";
import { ReceiptPaperForm } from "@/features/settings/components/receipt-paper-form";
import { PrintMethodForm } from "@/features/settings/components/print-method-form";
import { PrintDefaultsForm } from "@/features/settings/components/print-defaults-form";
import { ReceiptStyleForm } from "@/features/settings/components/receipt-style-form";
import { buildStylePreviews } from "@/features/settings/components/style-previews";
import { resolveInvoiceLang } from "@/features/invoices/print-labels";
import { requirePageAccess } from "@/lib/permissions";
import { getDictionary, getLocale } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function AppearancePage() {
  await requirePageAccess("SETTINGS_MANAGE");

  const [t, settings, locale] = await Promise.all([
    getDictionary(),
    getSystemSettings(),
    getLocale(),
  ]);
  // Style previews in the language documents print in by default.
  const previewLang = resolveInvoiceLang(undefined, settings.receiptLanguage ?? locale);

  return (
    <div className="space-y-6">
      <PageHeader title={t.admin.appearance} icon={Palette} />
      <Card>
        <CardHeader>
          <CardTitle>{t.settings.brandingTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <CompanyLogoForm logoUrl={settings.logoUrl} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t.settings.printing.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ReceiptPaperForm paper={settings.receiptPaperSize} />
          <PrintDefaultsForm
            textSize={settings.receiptTextSize}
            language={settings.receiptLanguage ?? "auto"}
          />
          <PrintMethodForm method={settings.printMethod} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t.settings.printing.stylesTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <ReceiptStyleForm
            style={settings.receiptStyle}
            previews={buildStylePreviews({
              lang: previewLang,
              logoUrl: settings.logoUrl,
              appName: settings.appName,
            })}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t.settings.appearanceTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <AppearanceForm settings={settings} />
        </CardContent>
      </Card>
    </div>
  );
}
