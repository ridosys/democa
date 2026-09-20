"use client";

import { useRouter, usePathname } from "next/navigation";
import { Check, ChevronDown, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { locales, localeCodes, localeLabels } from "@/i18n/config";
import { cn } from "@/lib/utils";
import type { Lang } from "@/features/invoices/components/invoice-print-view";

function LangBadge({ active, code }: { active?: boolean; code: string }) {
  return (
    <span
      className={cn(
        "flex h-5 min-w-8 shrink-0 items-center justify-center rounded-md px-1 text-[11px] font-bold tracking-wide tabular-nums",
        active
          ? "bg-primary text-primary-foreground!"
          : "bg-muted text-muted-foreground!",
      )}
    >
      {code}
    </span>
  );
}

/** Switches which language the invoice document itself is rendered/printed
 * in — independent of the signed-in staff member's own app UI locale
 * (LocaleSwitcher). Mirrors LocaleSwitcher's dropdown styling so it sits
 * naturally among the print header's other buttons instead of standing out
 * as a separate segmented strip, but navigates via `?lang=` instead of the
 * cookie-based locale mechanism. */
export function InvoiceLangSwitcher({ lang }: { lang: Lang }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button type="button" variant="outline" size="sm" className="gap-2">
            <Globe className="size-4" />
            {localeLabels[lang]}
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-48 p-1.5">
        {locales.map((option) => {
          const isActive = option === lang;
          return (
            <DropdownMenuItem
              key={option}
              onClick={() => router.push(`${pathname}?lang=${option}`)}
              className={cn(
                "gap-2.5 rounded-md py-2 cursor-pointer",
                isActive && "bg-accent text-accent-foreground",
              )}
            >
              <LangBadge code={localeCodes[option]} active={isActive} />
              <span className="flex-1 truncate font-medium">
                {localeLabels[option]}
              </span>
              {isActive && <Check className="size-4 shrink-0 text-primary!" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
