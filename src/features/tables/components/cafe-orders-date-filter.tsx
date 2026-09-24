"use client";

import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

export function CafeOrdersDateFilter({ date, label }: { date: string; label: string }) {
  const router = useRouter();
  return (
    <Input
      type="date"
      aria-label={label}
      value={date}
      className="w-auto"
      onChange={(e) => {
        if (e.target.value) router.push(`/caisse/cafe/orders?date=${e.target.value}`);
      }}
    />
  );
}
