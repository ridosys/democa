"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InvoicePrintButton({
  label,
  variant = "default",
}: {
  label: string;
  variant?: "default" | "outline";
}) {
  return (
    <Button variant={variant} onClick={() => window.print()} className={"cursor-pointer"}>
      <Printer className="size-4" />
      {label}
    </Button>
  );
}
