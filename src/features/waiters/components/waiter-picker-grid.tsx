"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CustomerAvatar } from "@/components/shared/customer-avatar";
import { assignWaiter } from "@/features/tables/actions";
import { useLocale } from "@/i18n/locale-provider";

type WaiterOption = { id: string; name: string; imageUrl: string | null };

/**
 * The Cafe Caisse "choose a waiter" step — shown after a table/takeaway
 * ticket is opened and before the order workspace itself. When `orderId`
 * is given (an order already exists for this table/ticket), picking a
 * waiter assigns it immediately via assignWaiter; otherwise the choice is
 * carried to the workspace via a `waiter` query param and only takes
 * effect once the first item creates the order.
 */
export function WaiterPickerGrid({
  waiters,
  orderId,
  workspaceHref,
}: {
  waiters: WaiterOption[];
  orderId?: string | null;
  workspaceHref: string;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const [isPending, startTransition] = useTransition();

  function handleSelect(waiterId: string) {
    if (!orderId) {
      router.push(`${workspaceHref}?waiter=${waiterId}`);
      return;
    }
    startTransition(async () => {
      const result = await assignWaiter(orderId, waiterId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.push(workspaceHref);
    });
  }

  if (waiters.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        {t.waiters.noActiveWaiters}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {waiters.map((waiter) => (
        <Card
          key={waiter.id}
          className="cursor-pointer transition-transform hover:-translate-y-0.5 active:scale-95"
          onClick={() => !isPending && handleSelect(waiter.id)}
        >
          <CardContent className="flex flex-col items-center gap-2 py-6">
            <CustomerAvatar
              name={waiter.name}
              imageUrl={waiter.imageUrl}
              seed={waiter.id}
              className="size-16 text-xl"
            />
            <p className="text-center text-sm font-medium">{waiter.name}</p>
          </CardContent>
        </Card>
      ))}
      {isPending && (
        <div className="col-span-full flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {t.common.saving}
        </div>
      )}
    </div>
  );
}
