"use client";

import { useCart } from "@/hooks/use-cart";
import { Badge } from "@/components/ui/badge";

export function CartBadge() {
  const { itemCount, isMounted } = useCart();

  if (!isMounted) return null;
  if (itemCount === 0) return null;

  return (
    <Badge className="absolute -top-2 -end-2 flex h-5 w-5 items-center justify-center p-0 text-xs">
      {itemCount}
    </Badge>
  );
}
