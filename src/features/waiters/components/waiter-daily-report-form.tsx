"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/i18n/locale-provider";
import { toDateInputValue } from "@/lib/date";

export function WaiterDailyReportForm({ waiterId }: { waiterId: string }) {
  const router = useRouter();
  const t = useT();
  const today = toDateInputValue(new Date());
  const [date, setDate] = useState(today);

  function openReport() {
    router.push(
      `/dashboard/waiters/${waiterId}/daily-report?date=${date || today}`,
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t.waiters.dailyReport.description}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="waiter-report-date">
            {t.waiters.dailyReport.dateLabel}
          </Label>
          <Input
            id="waiter-report-date"
            type="date"
            value={date}
            max={today}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>
        <Button type="button" onClick={openReport}>
          <FileDown className="size-4" />
          {t.waiters.dailyReport.generateButton}
        </Button>
      </div>
    </div>
  );
}
