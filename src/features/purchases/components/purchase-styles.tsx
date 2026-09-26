import { CalendarDays, ClipboardList, Hash, Package, Phone, Truck } from "lucide-react";
import { DocumentLogo } from "@/components/shared/document-logo";
import { ReceiptBrand, ReceiptLine, ReceiptRule } from "@/components/shared/receipt-parts";
import {
  BoldGrandTotal,
  BoldSection,
  BoldTitle,
  IconsSection,
  LeaderLine,
  SolidRule,
} from "@/components/shared/receipt-style-parts";
import { PURCHASE_PRINT_LABELS } from "@/features/purchases/print-labels";
import type { Lang } from "@/features/invoices/print-labels";
import { CURRENCY_LABEL, formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { ReceiptStyle } from "@/lib/receipt-style";

/**
 * The printed purchase invoice's body, in each style picked in Settings →
 * Printing. Rendered inside <ReceiptPaper> (everything sized in `em`) by the
 * print page, and with sample data by the settings style previews.
 */

export type PurchaseDoc = {
  orderNumber: string;
  createdAt: Date;
  supplierName: string;
  supplierPhone: string | null;
  items: { id: string; name: string; quantity: number; unitCost: number; weight: number }[];
};

export type PurchaseBodyProps = {
  doc: PurchaseDoc;
  lang: Lang;
  /** Thermal roll: stacked header, no side-by-side columns. */
  narrow: boolean;
  logoUrl: string | null;
  appName: string;
};

function summary(doc: PurchaseDoc) {
  return {
    count: doc.items.length,
    total: doc.items.reduce((sum, item) => sum + item.unitCost * item.quantity, 0),
    weight: doc.items.reduce((sum, item) => sum + item.weight * item.quantity, 0),
  };
}

const date = (value: Date) => new Date(value).toLocaleDateString("fr-FR");

export function PurchaseBody({ style, ...props }: PurchaseBodyProps & { style: ReceiptStyle }) {
  switch (style) {
    case "bold":
      return <BoldPurchase {...props} />;
    case "icons":
      return <IconsPurchase {...props} />;
    default:
      return <ClassicPurchase {...props} />;
  }
}

/** Empty box the supplier signs in. */
function Signature({ label, narrow }: { label: string; narrow: boolean }) {
  return (
    <div
      className={cn(
        "flex pt-[1.8em] break-inside-avoid",
        narrow ? "justify-center" : "justify-start",
      )}
    >
      <div className="flex flex-col items-center gap-[0.5em]">
        <div className="size-[9em] rounded-md border border-gray-300" />
        <p className="font-semibold">{label}</p>
      </div>
    </div>
  );
}

// ---------- classic ----------

function ClassicPurchase({ doc, lang, narrow, logoUrl, appName }: PurchaseBodyProps) {
  const t = PURCHASE_PRINT_LABELS[lang];
  const { count, total, weight } = summary(doc);
  const cell = cn(
    "px-[0.4em] py-[0.3em] text-start align-top border-gray-400",
    // Mid-word breaks only where the roll is too narrow for whole words.
    narrow ? "border [overflow-wrap:anywhere]" : "border-2 break-words",
  );

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th colSpan={4} className="border-none p-0 pb-[1.2em] text-start font-normal">
            <div
              className={cn(
                "flex gap-[0.8em]",
                narrow ? "flex-col items-center text-center" : "items-start justify-between",
              )}
            >
              <DocumentLogo
                logoUrl={logoUrl}
                name={appName}
                imgClassName="h-[3.5em] w-auto max-w-[14em] object-contain"
                nameClassName="text-[1.6em] font-bold"
              />
              <div className={narrow ? "text-center" : "text-end"}>
                <h2 className="text-[1.45em] leading-tight font-bold">{t.title}</h2>
                <p className="font-semibold">
                  {t.orderNumber}:{" "}
                  <span dir="ltr" className="[overflow-wrap:anywhere]">
                    {doc.orderNumber}
                  </span>
                </p>
                <p className="font-semibold">
                  {t.date}: {date(doc.createdAt)}
                </p>
              </div>
            </div>

            <div className="mt-[1em]">
              <p className="font-semibold">
                {t.supplier}:
                <span className="mx-[0.4em] font-bold">{doc.supplierName}</span>
              </p>
              {doc.supplierPhone && (
                <p className="font-semibold">
                  {t.phone}: <span dir="ltr">{doc.supplierPhone}</span>
                </p>
              )}
            </div>
          </th>
        </tr>
        <tr className="font-bold">
          <th className={cell}>{t.quantity}</th>
          <th className={cell}>{t.product}</th>
          <th className={cell}>
            {t.unitCost} ({CURRENCY_LABEL["fr"]})
          </th>
          <th className={cell}>
            {t.lineTotal} ({CURRENCY_LABEL["fr"]})
          </th>
        </tr>
      </thead>
      <tbody>
        {doc.items.map((item) => (
          <tr key={item.id} className="font-semibold">
            <td className={cell}>{item.quantity}</td>
            <td className={cell}>{item.name}</td>
            <td className={cn(cell, "whitespace-nowrap")}>
              {formatCurrency(item.unitCost, lang, true, 4)}
            </td>
            <td className={cn(cell, "whitespace-nowrap")}>
              {formatCurrency(item.unitCost * item.quantity, lang, true)}
            </td>
          </tr>
        ))}
        <tr>
          <td colSpan={4} className="border-none p-0 pt-[1em]">
            <div className="flex flex-wrap items-center justify-between gap-x-[1.5em] gap-y-[0.2em] border-t-2 border-gray-400 pt-[0.6em] font-semibold">
              <p>
                {t.itemsCount}: <span className="font-bold">{count}</span>
              </p>
              <p>
                {t.totalWeight}:{" "}
                <span className="font-bold" dir="ltr">
                  {weight.toFixed(2)} kg
                </span>
              </p>
            </div>

            <div className="mt-[0.6em] flex flex-wrap items-center justify-between gap-x-[1em] rounded-md border-2 border-gray-400 bg-gray-100 px-[0.8em] py-[0.4em] [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
              <p className="text-[1.1em] font-bold">{t.total}</p>
              <p className="ms-auto text-[1.25em] font-bold whitespace-nowrap">
                {formatCurrency(total, lang, false)}
              </p>
            </div>

            <Signature label={t.supplierSignature} narrow={narrow} />
          </td>
        </tr>
      </tbody>
    </table>
  );
}

// ---------- bold: black section bands, dotted leaders, boxed total ----------

function BoldPurchase({ doc, lang, narrow, logoUrl, appName }: PurchaseBodyProps) {
  const t = PURCHASE_PRINT_LABELS[lang];
  const { count, total, weight } = summary(doc);

  return (
    <>
      <ReceiptBrand logoUrl={logoUrl} name={appName} />
      <BoldTitle>{t.title}</BoldTitle>

      <div className="mt-[0.7em] flex flex-wrap items-start justify-between gap-x-[1em] gap-y-[0.3em]">
        <div className="min-w-0 space-y-[0.1em]">
          <p className="flex items-center gap-[0.4em] text-[1.1em]">
            <Truck className="size-[1.2em] shrink-0" />
            <span className="font-bold [overflow-wrap:anywhere]">{doc.supplierName}</span>
          </p>
          {doc.supplierPhone && (
            <p className="flex items-center gap-[0.4em]">
              <Phone className="size-[1.1em] shrink-0" />
              <span dir="ltr">{doc.supplierPhone}</span>
            </p>
          )}
        </div>
        <div className="ms-auto space-y-[0.1em]">
          <p className="flex items-center gap-[0.4em]">
            <Hash className="size-[1.1em] shrink-0" />
            <span dir="ltr" className="font-bold [overflow-wrap:anywhere]">
              {doc.orderNumber}
            </span>
          </p>
          <p className="flex items-center gap-[0.4em]">
            <CalendarDays className="size-[1.1em] shrink-0" />
            <span dir="ltr">{date(doc.createdAt)}</span>
          </p>
        </div>
      </div>

      <ReceiptRule />

      <BoldSection>
        {t.itemsSection} ({count})
      </BoldSection>
      <div className="space-y-[0.3em]">
        {doc.items.map((item) => (
          <div key={item.id}>
            <LeaderLine
              name={<span className="font-bold">{item.name}</span>}
              values={<span>{formatCurrency(item.unitCost * item.quantity, lang, true)}</span>}
            />
            <p className="ps-[1em] text-[0.9em]">
              <span dir="ltr">{item.quantity}</span> × {formatCurrency(item.unitCost, lang, true, 4)}
            </p>
          </div>
        ))}
      </div>
      <SolidRule />

      <BoldSection>{t.summarySection}</BoldSection>
      <ReceiptLine label={`${t.itemsCount}:`} value={String(count)} />
      <ReceiptLine label={`${t.totalWeight}:`} value={<span dir="ltr">{weight.toFixed(2)} kg</span>} />
      <BoldGrandTotal label={t.total} value={formatCurrency(total, lang, false)} />

      <Signature label={t.supplierSignature} narrow={narrow} />
    </>
  );
}

// ---------- icons: section icons, dashed rules, typewriter text ----------

function IconsPurchase({ doc, lang, narrow, logoUrl, appName }: PurchaseBodyProps) {
  const t = PURCHASE_PRINT_LABELS[lang];
  const { count, total, weight } = summary(doc);
  const columns = narrow
    ? "grid grid-cols-[1fr_auto] gap-x-[0.8em]"
    : "grid grid-cols-[1fr_auto_minmax(6em,auto)] gap-x-[1.5em]";

  return (
    <div className="font-mono">
      <div className="font-sans">
        <ReceiptBrand logoUrl={logoUrl} name={appName} />
        <h1 className="mt-[0.3em] text-center text-[1.9em] leading-tight font-bold">{t.title}</h1>
      </div>
      <p className="text-center text-[1.05em] [overflow-wrap:anywhere]" dir="ltr">
        {doc.orderNumber}
      </p>

      <div className="mt-[0.6em] flex flex-wrap items-end justify-between gap-x-[1em]">
        <div className="min-w-0">
          <p>
            {t.supplier}: <span className="font-bold">{doc.supplierName}</span>
          </p>
          {doc.supplierPhone && (
            <p>
              {t.phone}: <span dir="ltr">{doc.supplierPhone}</span>
            </p>
          )}
        </div>
        <p className="ms-auto text-end">
          {t.date}: <span dir="ltr">{date(doc.createdAt)}</span>
        </p>
      </div>

      <IconsSection icon={Package}>
        {t.itemsSection} ({count})
      </IconsSection>
      <div className={cn(columns, "gap-y-[0.2em]")}>
        {doc.items.map((item) => (
          <div key={item.id} className="contents">
            <span className="min-w-0 [overflow-wrap:anywhere]">
              {item.name}
              {narrow && (
                <span className="block text-[0.9em]">
                  <span dir="ltr">{item.quantity}</span> ×{" "}
                  {formatCurrency(item.unitCost, lang, true, 4)}
                </span>
              )}
            </span>
            {!narrow && (
              <span className="text-end whitespace-nowrap">
                <span dir="ltr">{item.quantity}</span> ×{" "}
                {formatCurrency(item.unitCost, lang, true, 4)}
              </span>
            )}
            <span className="text-end whitespace-nowrap">
              {formatCurrency(item.unitCost * item.quantity, lang, true)}
            </span>
          </div>
        ))}
      </div>

      <IconsSection icon={ClipboardList}>{t.summarySection}</IconsSection>
      <ReceiptLine label={`${t.itemsCount}:`} value={String(count)} />
      <ReceiptLine label={`${t.totalWeight}:`} value={<span dir="ltr">{weight.toFixed(2)} kg</span>} />
      <ReceiptLine
        className="mt-[0.5em] border-y-[3px] border-double border-black py-[0.25em] font-sans text-[1.4em] leading-tight font-bold"
        label={t.total}
        value={formatCurrency(total, lang, false)}
      />

      <Signature label={t.supplierSignature} narrow={narrow} />
    </div>
  );
}
