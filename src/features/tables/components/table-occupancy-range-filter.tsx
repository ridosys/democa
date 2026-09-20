"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/i18n/locale-provider";

/** Drives the table profile's Daily occupancy section via
 * occupancyFrom/occupancyTo URL params (defaulting server-side to the last
 * 15 days when absent — see defaultOccupancyRange in tables/queries.ts).
 * Changing the range always resets occupancyPage back to page 1, since the
 * old page number belongs to a window that no longer exists. */
export function TableOccupancyRangeFilter({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useLocale();

  function update(key: "occupancyFrom" | "occupancyTo", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("occupancyPage");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="occupancy-from" className="flex items-center gap-1 text-xs">
          <Calendar className="size-3.5" />
          {t.common.from}
        </Label>
        <Input
          id="occupancy-from"
          key={`from-${from}`}
          type="date"
          defaultValue={from}
          max={to}
          className="h-9 w-auto"
          onChange={(event) => update("occupancyFrom", event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="occupancy-to" className="flex items-center gap-1 text-xs">
          <Calendar className="size-3.5" />
          {t.common.to}
        </Label>
        <Input
          id="occupancy-to"
          key={`to-${to}`}
          type="date"
          defaultValue={to}
          min={from}
          className="h-9 w-auto"
          onChange={(event) => update("occupancyTo", event.target.value)}
        />
      </div>
    </div>
  );
}
