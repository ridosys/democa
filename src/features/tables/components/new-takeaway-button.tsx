"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NewTakeawayButton({ label }: { label: string }) {
  const router = useRouter();

  return (
    <Button
      className="cursor-pointer"
      onClick={() => router.push(`/caisse/cafe/takeaway/${crypto.randomUUID()}`)}
    >
      <Plus className="size-4" />
      {label}
    </Button>
  );
}
