"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  acceptCafeOrderRequest,
  rejectCafeOrderRequest,
} from "@/features/cafe-order-requests/actions";
import type { PendingCafeOrderRequest } from "@/features/cafe-order-requests/queries";
import { useLocale } from "@/i18n/locale-provider";
import { formatCurrency } from "@/lib/currency";

export function IncomingOrderCard({ request }: { request: PendingCafeOrderRequest }) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const [isPending, startTransition] = useTransition();

  function handleAccept() {
    startTransition(async () => {
      const result = await acceptCafeOrderRequest(request.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t.cafeOrderRequests.acceptedToast);
      // The table workspace itself already redirects to the waiter picker
      // when WAITERS is on and the order has none yet (see
      // caisse/cafe/table/[tableId]/page.tsx) — routing here instead of
      // straight to /waiter means a cafe with WAITERS off still lands
      // somewhere useful (the workspace) rather than an access-denied page.
      if (result.tableId) {
        router.push(`/caisse/cafe/table/${result.tableId}`);
      } else {
        router.refresh();
      }
    });
  }

  function handleReject() {
    startTransition(async () => {
      const result = await rejectCafeOrderRequest(request.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t.cafeOrderRequests.rejectedToast);
      router.refresh();
    });
  }

  return (
    <Card className="border-primary/40">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          <span>
            {t.tables.caisse.tableLabel} {request.tableName}
          </span>
          <span className="font-semibold text-primary">
            {formatCurrency(request.total, locale)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-1 text-xs text-muted-foreground">
          {request.items.map((item) => (
            <li key={item.id}>
              {item.quantity}× {item.productName}
              {item.options.length > 0 && (
                <span> ({item.options.map((o) => o.optionName).join(", ")})</span>
              )}
            </li>
          ))}
        </ul>
        {request.notes && <p className="text-xs italic text-muted-foreground">{request.notes}</p>}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 cursor-pointer"
            disabled={isPending}
            onClick={handleReject}
          >
            <X className="size-4" />
            {t.cafeOrderRequests.rejectButton}
          </Button>
          <Button
            size="sm"
            className="flex-1 cursor-pointer"
            disabled={isPending}
            onClick={handleAccept}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {t.cafeOrderRequests.acceptButton}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
