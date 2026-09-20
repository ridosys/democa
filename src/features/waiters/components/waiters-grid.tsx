"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowUpRight, Pencil, Phone } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CustomerAvatar } from "@/components/shared/customer-avatar";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { deleteWaiter } from "@/features/waiters/actions";
import { useLocale } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import type { getWaitersPage } from "@/features/waiters/queries";

type WaiterRow = Awaited<ReturnType<typeof getWaitersPage>>["items"][number];

export function WaitersGrid({ waiters }: { waiters: WaiterRow[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useLocale();

  function editHref(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("edit", id);
    return `${pathname}?${params.toString()}`;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {waiters.map((waiter) => (
        <Card
          key={waiter.id}
          className={cn(
            "group gap-4 transition-shadow hover:shadow-md",
            !waiter.isActive && "opacity-60",
          )}
        >
          <CardHeader className="flex flex-row items-start gap-3">
            <CustomerAvatar
              name={waiter.name}
              imageUrl={waiter.imageUrl}
              seed={waiter.id}
              className="size-12 shrink-0 ring-2 ring-primary/10"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-base font-semibold">{waiter.name}</p>
                {!waiter.isActive && (
                  <Badge variant="secondary" className="shrink-0">
                    {t.waiters.statusInactive}
                  </Badge>
                )}
              </div>
              {waiter.phone && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="size-3" />
                  {waiter.phone}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t.waiters.viewProfile}
              className="shrink-0 cursor-pointer rounded-full text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground"
              nativeButton={false}
              render={<Link href={`/dashboard/waiters/${waiter.id}`} />}
            >
              <ArrowUpRight className="size-4" />
            </Button>
          </CardHeader>
          <CardContent className="flex items-center gap-2 border-t pt-4">
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              nativeButton={false}
              render={<Link href={editHref(waiter.id)} />}
            >
              <Pencil className="size-4" />
              {t.common.edit}
            </Button>
            <ConfirmDeleteDialog
              action={() => deleteWaiter(waiter.id)}
              description={t.waiters.deleteDescription}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
