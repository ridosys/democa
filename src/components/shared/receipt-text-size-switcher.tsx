"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ALargeSmall, Check, ChevronDown } from "lucide-react";
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
  DEFAULT_RECEIPT_TEXT_SIZE,
  RECEIPT_TEXT_SIZES,
  type ReceiptTextSize,
} from "@/lib/receipt-paper";

/** Per-print text size via `?text=` (a % of the paper's base font size).
 * Keeps the other query params (lang, paper, …). `defaultSize` is the one
 * saved in settings — picking it drops the param. */
export function ReceiptTextSizeSwitcher({
  size,
  defaultSize = DEFAULT_RECEIPT_TEXT_SIZE,
}: {
  size: ReceiptTextSize;
  defaultSize?: ReceiptTextSize;
}) {
  const t = useT();
  const tp = t.settings.printing;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function select(option: ReceiptTextSize) {
    const params = new URLSearchParams(searchParams.toString());
    if (option === defaultSize) params.delete("text");
    else params.set("text", String(option));
    params.delete("auto");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            aria-label={tp.textSizeLabel}
            title={tp.textSizeLabel}
          >
            <ALargeSmall className="size-4" />
            <span dir="ltr" className="tabular-nums">{size}%</span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="max-h-80 w-48 p-1.5">
        {RECEIPT_TEXT_SIZES.map((option) => {
          const isActive = option === size;
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
                <span dir="ltr" className="tabular-nums">{option}%</span>
                {option === DEFAULT_RECEIPT_TEXT_SIZE && (
                  <span className="text-muted-foreground"> ({tp.textSizeNormal})</span>
                )}
              </span>
              {isActive && <Check className="size-4 shrink-0 text-primary!" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
