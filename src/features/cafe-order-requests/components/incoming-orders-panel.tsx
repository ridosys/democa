"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { IncomingOrderCard } from "@/features/cafe-order-requests/components/incoming-order-card";
import type { PendingCafeOrderRequest } from "@/features/cafe-order-requests/queries";
import { useLocale } from "@/i18n/locale-provider";

const POLL_INTERVAL_MS = 8000;

/** No websocket/push infra exists in this app, so new QR order requests are
 * surfaced by periodically re-fetching the server component tree — simple
 * and correct for a single-cafe-counter screen, not meant to scale beyond
 * that. */
export function IncomingOrdersPanel({ requests }: { requests: PendingCafeOrderRequest[] }) {
  const router = useRouter();
  const { t } = useLocale();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [router]);

  if (requests.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground">
        {t.cafeOrderRequests.incomingOrdersTitle}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {requests.map((request) => (
          <IncomingOrderCard key={request.id} request={request} />
        ))}
      </div>
    </section>
  );
}
