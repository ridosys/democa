"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_RECEIPT_TEXT_SIZE,
  RECEIPT_MONO_FONT,
  RECEIPT_PAPER_SPECS,
  type ReceiptPaperSize,
  type ReceiptTextSize,
} from "@/lib/receipt-paper";

const PX_PER_MM = 96 / 25.4;

/**
 * The printable sheet for receipts. Sized in real millimetres so what is on
 * screen is what comes out of the printer, always black-on-white regardless
 * of the app theme, and it owns the `@page` rule:
 *
 * - A5 / A4: fixed sheet, zero page margin (the padding here is the margin).
 * - 58mm / 80mm thermal rolls: the page height is measured from the rendered
 *   receipt, so the printer cuts right after the last line instead of
 *   feeding a full A4 length of blank paper.
 */
export function ReceiptPaper({
  id,
  paper,
  textSize = DEFAULT_RECEIPT_TEXT_SIZE,
  dir,
  className,
  children,
}: {
  id: string;
  paper: ReceiptPaperSize;
  /** % of the paper's base font size. */
  textSize?: ReceiptTextSize;
  dir: "rtl" | "ltr";
  className?: string;
  children: React.ReactNode;
}) {
  const spec = RECEIPT_PAPER_SPECS[paper];
  const ref = useRef<HTMLDivElement>(null);
  const [measuredMm, setMeasuredMm] = useState<number | null>(null);

  useEffect(() => {
    if (spec.heightMm !== null) return;
    const el = ref.current;
    if (!el) return;
    const update = () =>
      setMeasuredMm(Math.ceil(el.getBoundingClientRect().height / PX_PER_MM) + 2);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [spec.heightMm]);

  const pageHeight = spec.heightMm ?? measuredMm ?? 297;

  return (
    <>
      <style>{`
        @page { size: ${spec.widthMm}mm ${pageHeight}mm; margin: 0; }
        @media print {
          html, body { background: #fff !important; }
        }
      `}</style>
      <div
        id={id}
        ref={ref}
        dir={dir}
        data-paper={paper}
        className={cn(
          "mx-auto bg-white text-black shadow-md ring-1 ring-black/10 print:mx-0 print:shadow-none print:ring-0",
          "[&_a]:text-inherit [&_a]:no-underline",
          className,
        )}
        style={{
          width: `${spec.widthMm}mm`,
          padding: `${spec.paddingMm}mm`,
          fontSize: `${(spec.fontPx * textSize) / 100}px`,
          lineHeight: 1.35,
          fontFamily: dir === "rtl" ? undefined : RECEIPT_MONO_FONT,
        }}
      >
        {children}
      </div>
    </>
  );
}
