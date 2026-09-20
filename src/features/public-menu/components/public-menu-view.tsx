"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Loader2,
  CheckCircle2,
  Search,
  Send,
  Tag,
  StickyNote,
  PackageX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { BrandMark } from "@/components/shared/brand-mark";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import {
  submitCafeOrderRequest,
  fetchPublicProductOptionGroups,
} from "@/features/public-menu/actions";
import {
  OptionPickerDialog,
  type PickedOption,
  type ConfirmedUnit,
} from "@/features/product-options/components/option-picker-dialog";
import type { ProductOptionGroupsView } from "@/features/product-options/queries";
import type {
  PublicMenuCategory,
  PublicMenuProduct,
  PublicMenuProductFeed,
} from "@/features/public-menu/queries";
import { useLocale } from "@/i18n/locale-provider";
import { formatCurrency } from "@/lib/currency";

const NOTES_MAX_LENGTH = 300;

type CartLine = {
  key: string;
  productId: string;
  productName: string;
  productImage: string | null;
  unitPrice: number;
  quantity: number;
  options: PickedOption[];
};

function optionsKey(options: PickedOption[]): string {
  return options.map((o) => o.optionId ?? o.optionName).sort().join("|");
}

export function PublicMenuView({
  qrToken,
  tableName,
  logoUrl,
  categories,
  initialProducts,
}: {
  qrToken: string;
  tableName: string;
  logoUrl: string | null;
  categories: PublicMenuCategory[];
  initialProducts: PublicMenuProductFeed;
}) {
  const { locale, t } = useLocale();
  const [isPending, startTransition] = useTransition();
  const [categoryId, setCategoryId] = useState<string>("ALL");
  const [rawQuery, setRawQuery] = useState("");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [optionPicker, setOptionPicker] = useState<{
    product: PublicMenuProduct;
    groups: ProductOptionGroupsView;
  } | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [submitted, setSubmitted] = useState(false);

  // Products load 30 at a time — the first page arrives with the page's own
  // server render, every next page comes from /api/public-menu/products as
  // the sentinel below scrolls into view. Category/search changes reset to
  // a fresh first page instead of filtering the already-loaded list, so the
  // menu never silently caps out at whatever the first page happened to
  // contain.
  const [products, setProducts] = useState<PublicMenuProduct[]>(initialProducts.items);
  const [nextOffset, setNextOffset] = useState<number | null>(initialProducts.nextOffset);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const seenProductIdsRef = useRef<Set<string>>(new Set(initialProducts.items.map((p) => p.id)));
  const requestIdRef = useRef(0);
  const didMountRef = useRef(false);

  // Debounce raw keystrokes before they trigger a server refetch (same
  // 250ms pattern as PosWorkspace's own product search).
  useEffect(() => {
    const id = setTimeout(() => setQuery(rawQuery), 250);
    return () => clearTimeout(id);
  }, [rawQuery]);

  const fetchProductsPage = useCallback(
    async (reset: boolean, offset: number) => {
      const requestId = ++requestIdRef.current;
      setLoadingProducts(true);
      const params = new URLSearchParams();
      if (categoryId !== "ALL") params.set("categoryId", categoryId);
      if (query.trim()) params.set("q", query.trim());
      if (offset > 0) params.set("offset", String(offset));

      try {
        const res = await fetch(`/api/public-menu/products?${params.toString()}`);
        if (!res.ok) return;
        const data = (await res.json()) as PublicMenuProductFeed;
        if (requestId !== requestIdRef.current) return; // stale response

        if (reset) {
          seenProductIdsRef.current = new Set(data.items.map((p) => p.id));
          setProducts(data.items);
        } else {
          const fresh = data.items.filter((p) => !seenProductIdsRef.current.has(p.id));
          fresh.forEach((p) => seenProductIdsRef.current.add(p.id));
          setProducts((prev) => [...prev, ...fresh]);
        }
        setNextOffset(data.nextOffset);
      } finally {
        if (requestId === requestIdRef.current) setLoadingProducts(false);
      }
    },
    [categoryId, query],
  );

  // Reset + reload the product list whenever the category or search
  // changes. The very first run already matches what the server rendered
  // (all categories, no search), so it's skipped to avoid a redundant
  // refetch on mount.
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    fetchProductsPage(true, 0);
  }, [categoryId, query, fetchProductsPage]);

  // Infinite scroll: load the next page once the sentinel below the grid
  // enters the viewport. This page scrolls as a whole (no nested scroll
  // panel like POS/Cafe Caisse), so the observer watches the viewport
  // itself (root: null) instead of a ref'd container.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && nextOffset !== null && !loadingProducts) {
          fetchProductsPage(false, nextOffset);
        }
      },
      { rootMargin: "600px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [nextOffset, loadingProducts, fetchProductsPage]);

  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const lineTotal = (line: CartLine) =>
    (line.unitPrice + line.options.reduce((s, o) => s + o.priceAdjustment, 0)) * line.quantity;
  const cartTotal = cart.reduce((sum, line) => sum + lineTotal(line), 0);

  function addToCart(product: PublicMenuProduct, options: PickedOption[], quantity: number) {
    const key = `${product.id}|${optionsKey(options)}`;
    setCart((prev) => {
      const existing = prev.find((line) => line.key === key);
      if (existing) {
        return prev.map((line) =>
          line.key === key ? { ...line, quantity: line.quantity + quantity } : line,
        );
      }
      return [
        ...prev,
        {
          key,
          productId: product.id,
          productName: product.name,
          productImage: product.image,
          unitPrice: product.price,
          quantity,
          options,
        },
      ];
    });
  }

  function handleProductTap(product: PublicMenuProduct) {
    startTransition(async () => {
      const groups = await fetchPublicProductOptionGroups(product.id);
      // Always confirm through the dialog, even for a product with no
      // option groups — OptionPickerDialog degrades gracefully to a plain
      // quantity stepper when `groups` is empty, so this is still the one
      // path for "how many?" instead of silently adding a single unit.
      setOptionPicker({ product, groups });
    });
  }

  function setLineQuantity(key: string, quantity: number) {
    setCart((prev) =>
      quantity <= 0 ? prev.filter((line) => line.key !== key) : prev.map((line) => (line.key === key ? { ...line, quantity } : line)),
    );
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await submitCafeOrderRequest({
        qrToken,
        idempotencyKey,
        notes: notes || undefined,
        items: cart.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          optionIds: line.options.map((o) => o.optionId).filter((id): id is string => Boolean(id)),
        })),
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setSubmitted(true);
      setCart([]);
      setNotes("");
      setCartOpen(false);
      setIdempotencyKey(crypto.randomUUID());
    });
  }

  if (submitted) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <CheckCircle2 className="size-16 text-primary" />
        <h1 className="text-lg font-semibold">{t.publicMenu.submittedTitle}</h1>
        <p className="max-w-sm text-sm text-muted-foreground">{t.publicMenu.submittedDescription}</p>
        <Button className="cursor-pointer" onClick={() => setSubmitted(false)}>
          {t.publicMenu.orderMoreButton}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-24">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4">
        <div className="flex shrink-0 items-center gap-2">
          <BrandMark size="sm" logoUrl={logoUrl} />
          <div className="hidden sm:block">
            <p className="text-sm font-semibold leading-none">{tableName}</p>
            <p className="text-xs text-muted-foreground">{t.publicMenu.menuTitle}</p>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
          <Input
            value={rawQuery}
            onChange={(e) => setRawQuery(e.target.value)}
            placeholder={t.publicMenu.searchPlaceholder}
            className="rounded-full ps-9"
          />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <LocaleSwitcher />
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto border-b bg-card px-4 py-2.5">
        <Button
          size="sm"
          variant={categoryId === "ALL" ? "default" : "outline"}
          className="shrink-0 cursor-pointer rounded-full"
          onClick={() => setCategoryId("ALL")}
        >
          {t.publicMenu.allCategories}
        </Button>
        {categories.map((category) => (
          <Button
            key={category.id}
            size="sm"
            variant={categoryId === category.id ? "default" : "outline"}
            className="shrink-0 cursor-pointer rounded-full"
            onClick={() => setCategoryId(category.id)}
          >
            {category.name}
          </Button>
        ))}
      </div>

      {products.length === 0 && !loadingProducts ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
          <PackageX className="size-8" />
          <p className="text-sm">{t.publicMenu.noProductsFound}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
          {products.map((product) => (
          <Card key={product.id} className="overflow-hidden py-0">
            {product.image ? (
              // eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL, matches DocumentLogo's own precedent
              <img
                src={product.image}
                alt={product.name}
                className="h-32 w-full object-cover sm:h-40"
              />
            ) : (
              <div className="flex h-32 w-full items-center justify-center bg-muted sm:h-40">
                <ShoppingBag className="size-8 text-muted-foreground" />
              </div>
            )}
            <CardContent className="space-y-2 p-3">
              <p className="line-clamp-2 text-sm font-medium">{product.name}</p>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-primary">
                  {formatCurrency(product.price, locale)}
                </p>
                <Button
                  size="sm"
                  className="cursor-pointer gap-1 rounded-full"
                  disabled={isPending}
                  onClick={() => handleProductTap(product)}
                >
                  <Plus className="size-3.5" />
                  {t.publicMenu.addButton}
                </Button>
              </div>
            </CardContent>
          </Card>
          ))}
        </div>
      )}

      {/* Infinite-scroll trigger — 600px of lead-in so the next page is
       * already loading before the user hits the actual bottom. Also
       * doubles as the loading indicator between pages. */}
      <div ref={sentinelRef} className="flex justify-center py-4">
        {loadingProducts && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
      </div>

      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t bg-card p-3">
          <Button
            className="w-full cursor-pointer"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingBag className="size-4" />
            {t.publicMenu.viewCartButton} ({cartCount}) — {formatCurrency(cartTotal, locale)}
          </Button>
        </div>
      )}

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent className="flex flex-col overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShoppingBag className="size-4.5" />
              </span>
              <div>
                <SheetTitle>{t.publicMenu.cartTitle}</SheetTitle>
                <p className="text-xs text-muted-foreground">{tableName}</p>
              </div>
            </div>
          </SheetHeader>
          <div className="flex-1 space-y-3 px-4">
            {cart.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {t.publicMenu.emptyCartMessage}
              </p>
            ) : (
              cart.map((line) => (
                <div key={line.key} className="flex gap-3 rounded-lg border p-2">
                  {line.productImage ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL
                    <img
                      src={line.productImage}
                      alt={line.productName}
                      className="size-14 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-md bg-muted">
                      <ShoppingBag className="size-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-medium">{line.productName}</p>
                      <p className="shrink-0 text-sm font-semibold">
                        {formatCurrency(lineTotal(line), locale)}
                      </p>
                    </div>
                    {line.options.length > 0 && (
                      <div className="space-y-0.5">
                        {line.options.map((option) => (
                          <p
                            key={option.optionId ?? option.optionName}
                            className="flex items-center gap-1 text-xs text-muted-foreground"
                          >
                            <Tag className="size-3 shrink-0" />
                            <span className="truncate">
                              {option.optionName}
                              {option.priceAdjustment !== 0 &&
                                ` (+${formatCurrency(option.priceAdjustment, locale)})`}
                            </span>
                          </p>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-1 pt-1">
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => setLineQuantity(line.key, line.quantity - 1)}
                      >
                        <Minus />
                      </Button>
                      <span className="min-w-6 text-center text-xs font-semibold tabular-nums">
                        {line.quantity}
                      </span>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => setLineQuantity(line.key, line.quantity + 1)}
                      >
                        <Plus />
                      </Button>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        className="ms-auto cursor-pointer text-destructive hover:text-destructive"
                        onClick={() => setLineQuantity(line.key, 0)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="public-menu-notes">{t.publicMenu.notesLabel}</Label>
                <span className="text-xs text-muted-foreground">
                  {notes.length}/{NOTES_MAX_LENGTH}
                </span>
              </div>
              <div className="relative">
                <StickyNote className="pointer-events-none absolute start-3 top-3 size-4 text-muted-foreground" />
                <Textarea
                  id="public-menu-notes"
                  value={notes}
                  maxLength={NOTES_MAX_LENGTH}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t.publicMenu.notesPlaceholder}
                  className="ps-9"
                />
              </div>
            </div>
          </div>
          <div className="space-y-3 border-t p-4">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>{t.publicMenu.totalLabel}</span>
              <span>{formatCurrency(cartTotal, locale)}</span>
            </div>
            <Button
              className="w-full cursor-pointer gap-2"
              disabled={cart.length === 0 || isPending}
              onClick={handleSubmit}
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              {t.publicMenu.sendOrderButton}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {optionPicker && (
        <OptionPickerDialog
          open={Boolean(optionPicker)}
          onOpenChange={(open) => {
            if (!open) setOptionPicker(null);
          }}
          productName={optionPicker.product.name}
          basePrice={optionPicker.product.price}
          groups={optionPicker.groups}
          onConfirm={(units: ConfirmedUnit[]) => {
            for (const unit of units) {
              addToCart(optionPicker.product, unit.options, unit.quantity);
            }
            setOptionPicker(null);
          }}
        />
      )}
    </div>
  );
}
