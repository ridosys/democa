"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGoBack } from "@/components/shared/back-button";
import { waitUntilPageReturns } from "@/lib/page-return";

export function InvoicePrintButton({
  label,
  variant = "default",
  backHref,
}: {
  label: string;
  variant?: "default" | "outline";
  /** When set, goes back to the previous page (or here, without history)
   * once the print dialog is closed. */
  backHref?: string;
}) {
  const goBack = useGoBack(backHref ?? "/");

  function handleClick() {
    if (backHref) {
      window.addEventListener(
        "afterprint",
        () => void waitUntilPageReturns().then(goBack),
        { once: true },
      );
    }
    window.print();
  }

  return (
    <Button variant={variant} onClick={handleClick} className={"cursor-pointer"}>
      <Printer className="size-4" />
      {label}
    </Button>
  );
}
