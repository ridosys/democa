import { notFound } from "next/navigation";
import {
  InvoicePrintView,
  resolveInvoiceLang,
} from "@/features/invoices/components/invoice-print-view";
import { loadInvoicePrintData } from "@/features/invoices/print-data";
import { requirePageAccess } from "@/lib/permissions";
import { resolveReceiptPaper } from "@/lib/receipt-paper";
import { hasFeature } from "@/lib/features";
import { getDictionary } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function CaisseInvoicePrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    lang?: string;
    auto?: string;
    paper?: string;
    autoprint?: string;
  }>;
}) {
  await requirePageAccess("POS_VIEW");

  const { id } = await params;
  const {
    lang: langParam,
    auto,
    paper: paperParam,
    autoprint,
  } = await searchParams;

  const [data, t, cafeCaisseEnabled, retailCaisseEnabled] = await Promise.all([
    loadInvoicePrintData(id),
    getDictionary(),
    hasFeature("CAFE_CAISSE"),
    hasFeature("RETAIL_CAISSE"),
  ]);
  if (!data) notFound();

  const lang = resolveInvoiceLang(langParam, data.invoice.language);
  const paper = resolveReceiptPaper(paperParam, data.settings.receiptPaperSize);
  // Whichever Caisse is actually reachable — a pure Cafe install has no
  // /caisse to go back to.
  const homeHref = !retailCaisseEnabled && cafeCaisseEnabled ? "/caisse/cafe" : "/caisse";

  return (
    <InvoicePrintView
      invoice={data.invoice}
      settings={data.settings}
      otherOutstandingInvoices={data.otherOutstandingInvoices}
      lang={lang}
      paper={paper}
      auto={auto}
      autoPrint={autoprint === "1"}
      backHref={homeHref}
      homeHref={homeHref}
      homeLabel={t.admin.caisse}
    />
  );
}
