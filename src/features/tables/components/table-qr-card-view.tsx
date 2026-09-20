import { QRCodeSVG } from "qrcode.react";
import { DocumentLogo } from "@/components/shared/document-logo";
import { BackButton } from "@/components/shared/back-button";
import { InvoicePrintButton } from "@/features/invoices/components/invoice-print-button";
import { getDictionary } from "@/i18n/server";

const SCAN_TO_ORDER = {
  ar: "امسح الرمز لطلب من الطاولة",
  en: "Scan to order from this table",
  fr: "Scannez pour commander depuis cette table",
};

export async function TableQrCardView({
  tableName,
  logoUrl,
  appName,
  orderUrl,
}: {
  tableName: string;
  logoUrl: string | null;
  appName: string;
  orderUrl: string;
}) {
  const t = await getDictionary();

  return (
    <div className="mx-auto max-w-sm space-y-4 p-6 print:p-0">
      <div className="flex items-center justify-between print:hidden">
        <BackButton fallbackHref="/dashboard/tables" />
        <InvoicePrintButton label={t.common.printSavePdf} />
      </div>

      <div className="flex flex-col items-center gap-4 rounded-2xl border p-8 text-center print:border-none">
        <DocumentLogo logoUrl={logoUrl} name={appName} />
        <h1 className="text-xl font-bold">{tableName}</h1>
        <QRCodeSVG value={orderUrl} size={220} />
        <div className="space-y-1">
          {(Object.keys(SCAN_TO_ORDER) as (keyof typeof SCAN_TO_ORDER)[]).map((lang) => (
            <p key={lang} className="text-sm font-medium">
              {SCAN_TO_ORDER[lang]}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
