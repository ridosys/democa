import Link from "next/link";
import { Calculator } from "lucide-react";
import { BackButton } from "@/components/shared/back-button";
import { BrandMark } from "@/components/shared/brand-mark";
import { ReceiptPaperSwitcher } from "@/components/shared/receipt-paper-switcher";
import { ReceiptTextSizeSwitcher } from "@/components/shared/receipt-text-size-switcher";
import { Button } from "@/components/ui/button";
import { InvoiceLangSwitcher } from "@/features/invoices/components/invoice-lang-switcher";
import { InvoicePdfButton } from "@/features/invoices/components/invoice-pdf-button";
import { InvoicePrintButton } from "@/features/invoices/components/invoice-print-button";
import { BluetoothPrintButton } from "@/features/invoices/components/bluetooth-print-button";
import type { Lang } from "@/features/invoices/print-labels";
import { getSystemSettings } from "@/features/settings/queries";
import { getDictionary } from "@/i18n/server";
import type { PrintDocRef } from "@/lib/print-document";
import type { PrintMethod } from "@/lib/print-method";
import type { ReceiptPaperSize, ReceiptTextSize } from "@/lib/receipt-paper";

/**
 * The print-page toolbar shared by every printable document (sales
 * invoice, purchase invoice, waiter daily report): back, document language,
 * paper size, text size, PDF, browser print and — when set in settings —
 * the Android printer app. Printing goes back to the previous page.
 */
export async function PrintToolbar({
  doc,
  logoUrl,
  printMethod,
  backHref,
  homeHref,
  homeLabel,
  lang,
  paper,
  textSize,
  pdfTargetId,
  pdfFileName,
  pdfAutoOpen,
}: {
  doc: PrintDocRef;
  logoUrl: string | null;
  printMethod: PrintMethod;
  backHref: string;
  /** An explicit "go home" destination next to Back (e.g. the Caisse). */
  homeHref?: string;
  homeLabel?: string;
  lang: Lang;
  paper: ReceiptPaperSize;
  textSize: ReceiptTextSize;
  pdfTargetId: string;
  pdfFileName: string;
  pdfAutoOpen?: boolean;
}) {
  const [t, settings] = await Promise.all([getDictionary(), getSystemSettings()]);
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 print:hidden">
      <div className="flex items-center gap-3">
        <BrandMark size="sm" logoUrl={logoUrl} />
        <BackButton fallbackHref={backHref} />
        {homeHref && (
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer"
            nativeButton={false}
            render={<Link href={homeHref} />}
          >
            <Calculator className="size-4" />
            {homeLabel}
          </Button>
        )}
      </div>
      <div className="hidden h-6 w-px bg-border sm:block" />
      <div className="flex flex-wrap items-center justify-center gap-2">
        <InvoiceLangSwitcher lang={lang} />
        <ReceiptPaperSwitcher paper={paper} />
        <ReceiptTextSizeSwitcher size={textSize} defaultSize={settings.receiptTextSize} />
        <InvoicePdfButton
          targetId={pdfTargetId}
          fileName={pdfFileName}
          label={t.common.openPdf}
          autoOpen={pdfAutoOpen}
          paper={paper}
        />
        <InvoicePrintButton
          label={t.common.printSavePdf}
          variant={printMethod === "browser" ? "default" : "outline"}
          backHref={backHref}
        />
        <BluetoothPrintButton
          doc={doc}
          method={printMethod}
          variant="default"
          options={{ lang, paper, textSize: String(textSize) }}
          backHref={backHref}
        />
      </div>
    </div>
  );
}
