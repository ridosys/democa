"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, Printer } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import {
  RECEIPT_PAPER_SIZES,
  type ReceiptPaperSize,
} from "@/lib/receipt-paper";

/** Per-print paper override via `?paper=` — the saved default lives in
 * Settings → Appearance. Keeps the other query params (lang, date, …). */
export function ReceiptPaperSwitcher({ paper }: { paper: ReceiptPaperSize }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function select(option: ReceiptPaperSize) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("paper", option);
    params.delete("auto");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button type="button" variant="outline" size="sm" className="gap-2">
            <Printer className="size-4" />
            {t.settings.printing.options[paper]}
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-48 p-1.5">
        {RECEIPT_PAPER_SIZES.map((option) => {
          const isActive = option === paper;
          return (
            <DropdownMenuItem
              key={option}
              onClick={() => select(option)}
              className={cn(
                "cursor-pointer gap-2.5 rounded-md py-2",
                isActive && "bg-accent text-accent-foreground",
              )}
            >
              <span className="flex-1 truncate font-medium">
                {t.settings.printing.options[option]}
              </span>
              {isActive && <Check className="size-4 shrink-0 text-primary!" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
