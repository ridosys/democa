"use client";

import { useEffect, useRef, useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/locale-provider";
import {
  RECEIPT_PAPER_SPECS,
  type ReceiptPaperSize,
} from "@/lib/receipt-paper";

export function InvoicePdfButton({
  targetId,
  fileName,
  label,
  autoOpen = false,
  paper,
}: {
  targetId: string;
  fileName: string;
  label: string;
  /** When true, generate the PDF once shortly after mount — used when the
   * page is opened with `?auto=pdf` (from the La Caisse success dialog). */
  autoOpen?: boolean;
  /** Receipt paper the target is laid out for. The target already carries
   * its own padding, so the PDF page is the paper itself with no margin; a
   * thermal roll gets a page exactly as long as the receipt. Omitted →
   * the legacy A5 layout with a 6mm margin. */
  paper?: ReceiptPaperSize;
}) {
  const t = useT();
  const [isGenerating, setIsGenerating] = useState(false);
  const autoFired = useRef(false);

  async function handleClick() {
    const target = document.getElementById(targetId);
    if (!target) return;

    setIsGenerating(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
      ]);

      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const canvasRatio = canvas.width / canvas.height;
      const spec = paper ? RECEIPT_PAPER_SPECS[paper] : null;

      let pdf: InstanceType<typeof jsPDF>;
      if (spec && spec.heightMm === null) {
        const height = spec.widthMm / canvasRatio;
        pdf = new jsPDF({
          orientation: height >= spec.widthMm ? "portrait" : "landscape",
          unit: "mm",
          format: [spec.widthMm, height],
        });
        pdf.addImage(imgData, "PNG", 0, 0, spec.widthMm, height);
      } else {
        pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: spec ? [spec.widthMm, spec.heightMm!] : "a5",
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = spec ? 0 : 6;
        const maxWidth = pageWidth - margin * 2;
        const maxHeight = pageHeight - margin * 2;

        let imgWidth = maxWidth;
        let imgHeight = imgWidth / canvasRatio;
        if (imgHeight > maxHeight) {
          imgHeight = maxHeight;
          imgWidth = imgHeight * canvasRatio;
        }

        const x = (pageWidth - imgWidth) / 2;
        pdf.addImage(imgData, "PNG", x, margin, imgWidth, imgHeight);
      }
      pdf.setProperties({ title: fileName });

      const blobUrl = pdf.output("bloburl");
      window.open(blobUrl, "_blank");
    } catch (error) {
      console.error(error);
      toast.error(t.common.pdfError);
    } finally {
      setIsGenerating(false);
    }
  }

  useEffect(() => {
    if (!autoOpen || autoFired.current) return;
    autoFired.current = true;
    const id = setTimeout(() => {
      void handleClick();
    }, 600);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen]);

  return (
    <Button
      variant="outline"
      onClick={handleClick}
      disabled={isGenerating}
      className="cursor-pointer"
    >
      {isGenerating ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <FileDown className="size-4" />
      )}
      {label}
    </Button>
  );
}
