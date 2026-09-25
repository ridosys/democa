"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, ReceiptText, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchCheckedOutCafeOrdersAction } from "@/features/tables/actions";
import type { CheckedOutCafeOrder } from "@/features/tables/queries";
import type { PrintMethod } from "@/lib/print-method";
import { CafeOrderActions } from "@/features/tables/components/cafe-order-actions";
import { useLocale } from "@/i18n/locale-provider";
import { formatMessage } from "@/i18n/format";
import { formatCurrency } from "@/lib/currency";

function formatTime(date: Date) {
  return new Date(date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

/** Checked-out orders grid with infinite scroll: the server renders the
 * first page, and the next page loads when the bottom sentinel scrolls into
 * view. Remounted (via `key`) whenever the day or its totals change, so a
 * delete / reopen starts again from a fresh first page. */
export function CafeOrdersList({
  date,
  totalCount,
  initialItems,
  initialNextOffset,
  printMethod,
}: {
  date: string;
  totalCount: number;
  initialItems: CheckedOutCafeOrder[];
  initialNextOffset: number | null;
  printMethod: PrintMethod;
}) {
  const { t, locale } = useLocale();
  const to = t.tables.caisse.orders;
  const [items, setItems] = useState(initialItems);
  const [nextOffset, setNextOffset] = useState(initialNextOffset);
  const [loading, setLoading] = useState(false);
  // Set after a failed page load so the observer stops auto-retrying; the
  // Retry button clears it.
  const [failed, setFailed] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (nextOffset === null) return;
    setLoading(true);
    try {
      const page = await fetchCheckedOutCafeOrdersAction(date, nextOffset);
      if (!page) throw new Error("NO_ACCESS");
      setItems((prev) => {
        const seen = new Set(prev.map((order) => order.id));
        return [...prev, ...page.items.filter((order) => !seen.has(order.id))];
      });
      setNextOffset(page.nextOffset);
    } catch {
      setFailed(true);
      toast.error(to.loadMoreError);
    } finally {
      setLoading(false);
    }
  }, [date, nextOffset, to.loadMoreError]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && nextOffset !== null && !loading && !failed) {
          void loadMore();
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [nextOffset, loading, failed, loadMore]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-muted-foreground">
        <ReceiptText className="size-8" />
        <p className="text-sm">{to.empty}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {items.map((order) => (
          <div
            key={order.id}
            className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold" dir="ltr">
                  {order.invoiceNumber}
                </p>
                <p className="text-xs text-muted-foreground">
                  <span dir="ltr">{formatTime(order.checkedOutAt)}</span> ·{" "}
                  {order.type === "DINE_IN"
                    ? `${t.tables.caisse.tableLabel} ${order.tableName ?? ""}`
                    : t.tables.caisse.takeawayLabel}
                  {order.waiterName && ` · ${to.waiterLabel}: ${order.waiterName}`}
                </p>
              </div>
              <Badge
                variant={
                  order.paymentStatus === "PAID"
                    ? "default"
                    : order.paymentStatus === "PARTIALLY_PAID"
                      ? "secondary"
                      : "destructive"
                }
              >
                {t.statusLabels.paymentStatus[order.paymentStatus]}
              </Badge>
            </div>

            <ul className="flex-1 space-y-1 text-sm">
              {order.items.map((item, index) => (
                <li key={index} className="flex justify-between gap-2">
                  <span className="min-w-0 truncate">
                    {item.name}
                    {item.options.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {" "}
                        ({item.options.join(", ")})
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    × {item.quantity}
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between border-t pt-3 text-sm">
              <span className="text-muted-foreground">
                {to.paidLabel}: {formatCurrency(order.paidAmount, locale)} ·{" "}
                {t.statusLabels.paymentMethod[order.paymentMethod]}
              </span>
              <span className="font-bold">{formatCurrency(order.total, locale)}</span>
            </div>

            <CafeOrderActions
              orderId={order.id}
              invoiceId={order.invoiceId}
              invoiceNumber={order.invoiceNumber}
              printMethod={printMethod}
            />
          </div>
        ))}
      </div>

      {loading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      )}

      <div ref={sentinelRef} className="h-px w-full" />

      <p className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
        {loading ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            {to.loadingMore}
          </>
        ) : failed ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={() => {
              setFailed(false);
              void loadMore();
            }}
          >
            <RotateCw className="size-3.5" />
            {to.retryButton}
          </Button>
        ) : (
          <>
            {formatMessage(to.shownTemplate, { shown: items.length, count: totalCount })}
            {nextOffset !== null && ` · ${to.scrollToLoadMore}`}
          </>
        )}
      </p>
    </div>
  );
}
