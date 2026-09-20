"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Layout } from "react-resizable-panels";
import {
  ArrowRight,
  Loader2,
  Minus,
  Pencil,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { BrandMark } from "@/components/shared/brand-mark";
import { AccountMenu } from "@/components/shared/account-menu";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { CategoryRail, type PosCategory } from "@/features/pos/components/category-rail";
import { ProductGrid } from "@/features/pos/components/product-grid";
import type { PosProduct } from "@/features/pos/queries";
import {
  addItemToOpenOrder,
  setOpenOrderLineQuantity,
  type OpenOrderCartLine,
  type SelectedOption,
} from "@/features/tables/actions";
import { getOrCreateInvoiceForOrder } from "@/features/invoices/actions";
import {
  fetchProductOptionGroupsAction,
} from "@/features/product-options/actions";
import {
  OptionPickerDialog,
  type ConfirmedUnit,
} from "@/features/product-options/components/option-picker-dialog";
import type { ProductOptionGroupsView } from "@/features/product-options/queries";
import { useLocale } from "@/i18n/locale-provider";
import { formatCurrency } from "@/lib/currency";
import type { Locale } from "@/i18n/config";
import type { InvoiceLanguage, PaymentMethod } from "@/generated/prisma/client";

type ProductFeed = { items: PosProduct[]; total: number; nextOffset: number | null };
type CategoryFeed = { total: number; items: PosCategory[]; nextOffset: number | null };

const PAYMENT_METHODS: PaymentMethod[] = ["CASH", "BANK_TRANSFER", "CREDIT_CARD", "OTHER"];

function langFromLocale(locale: Locale): InvoiceLanguage {
  return locale === "en" ? "EN" : locale === "fr" ? "FR" : "AR";
}

// Cashier-adjustable panel widths (categories / products / current order),
// kept in localStorage across sessions — same drag-to-resize pattern as
// Retail POS (see PosWorkspace's PANEL_LAYOUT_KEY), under its own key so
// resizing one doesn't affect the other's saved widths.
const CAFE_PANEL_LAYOUT_KEY =
  "react-resizable-panels:cafe-order-panels-v1:categories:products:order";

function readCafePanelLayout(): Layout | undefined {
  try {
    const saved = JSON.parse(window.localStorage.getItem(CAFE_PANEL_LAYOUT_KEY) ?? "null");
    if (!saved || typeof saved !== "object") return;
    const sizes = [saved.categories, saved.products, saved.order];
    if (
      sizes.every((size) => typeof size === "number" && Number.isFinite(size) && size > 0) &&
      Math.abs(sizes.reduce((sum, size) => sum + size, 0) - 100) < 0.1
    ) {
      return { categories: saved.categories, products: saved.products, order: saved.order };
    }
  } catch {
    // Missing, corrupt, or blocked storage leaves the default widths usable.
  }
}

export function OpenOrderWorkspace({
  adminName,
  logoUrl,
  canDashboard,
  mode,
  tableId,
  tableName,
  initialOrderId,
  initialItems,
  initialCategories,
  initialProducts,
  waiterId,
  waiterName,
  changeWaiterHref,
}: {
  adminName: string;
  logoUrl: string | null;
  canDashboard: boolean;
  mode: "DINE_IN" | "TAKEAWAY";
  tableId?: string;
  tableName?: string;
  initialOrderId: string | null;
  initialItems: OpenOrderCartLine[];
  initialCategories: CategoryFeed;
  initialProducts: ProductFeed;
  /** Chosen before this screen ever renders (see the /waiter picker route) —
   * fixed for the lifetime of this page load; changing it goes through
   * changeWaiterHref, which reloads the page with the new value. All three
   * are null together when the WAITERS feature is off, in which case no
   * waiter step ever ran and this order simply has none. */
  waiterId: string | null;
  waiterName: string | null;
  changeWaiterHref: string | null;
}) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const [isPending, startTransition] = useTransition();
  const [orderId, setOrderId] = useState(initialOrderId);
  const [items, setItems] = useState<OpenOrderCartLine[]>(initialItems);
  const [categoryId, setCategoryId] = useState("ALL");
  const [categoryName, setCategoryName] = useState(t.pos.allCategories);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [optionPicker, setOptionPicker] = useState<{
    product: PosProduct;
    groups: ProductOptionGroupsView;
  } | null>(null);

  // Wide screens get the same drag-to-resize/collapse 3-panel layout as
  // Retail POS; narrower ones (a waiter's phone at the table) keep the
  // simple stacked layout, since react-resizable-panels doesn't have a
  // CSS-only responsive mode. Defaults to the stacked layout on the server
  // and the first client render (matches, no hydration mismatch), then
  // upgrades after mount once the real viewport width is known.
  const [isDesktop, setIsDesktop] = useState(false);
  const [panelLayout, setPanelLayout] = useState<Layout>();

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const desktopNow = mql.matches;
    const savedLayout = readCafePanelLayout();
    // setState is deferred a tick so it doesn't run synchronously inside
    // the effect (same pattern as PosWorkspace's session restore).
    const id = setTimeout(() => {
      setIsDesktop(desktopNow);
      setPanelLayout(savedLayout);
    }, 0);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener("change", onChange);
    return () => {
      clearTimeout(id);
      mql.removeEventListener("change", onChange);
    };
  }, []);

  function onPanelLayoutChanged(layout: Layout, meta: { isUserInteraction: boolean }) {
    if (!meta.isUserInteraction) return;
    setPanelLayout(layout);
    try {
      window.localStorage.setItem(CAFE_PANEL_LAYOUT_KEY, JSON.stringify(layout));
    } catch {
      // Resizing remains available when browser storage is blocked or full.
    }
  }

  const total = useMemo(
    () => items.reduce((sum, line) => sum + line.price * line.quantity, 0),
    [items],
  );
  // Sums every option-variant line for a product into one badge on its grid
  // tile — the tile itself can't represent which variant, only how many
  // units of that product are in the cart overall.
  const cartQuantities = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const line of items) {
      totals[line.productId] = (totals[line.productId] ?? 0) + line.quantity;
    }
    return totals;
  }, [items]);

  function addWithOptions(
    product: PosProduct,
    options: SelectedOption[] | undefined,
    quantity = 1,
  ) {
    addUnitsWithOptions(product, [{ options: options ?? [], quantity }]);
  }

  /** Each unit gets its own server call so a product with distinct option
   * choices per unit (e.g. "1 small coffee and 1 large coffee" from one
   * dialog confirm) lands as separate lines rather than one line with one
   * shared option set. Calls run sequentially, threading a local order id
   * through the loop instead of re-reading the `orderId` state variable —
   * that state only updates on the next render, so a second call in the
   * same batch would otherwise still see it as unset and could create a
   * second order for the same table. */
  function addUnitsWithOptions(
    product: PosProduct,
    units: { options: SelectedOption[]; quantity: number }[],
  ) {
    startTransition(async () => {
      let currentOrderId = orderId;
      for (const unit of units) {
        // Final unit price = base price + every selected option's
        // adjustment — computed once here, the same way Order line prices
        // are already editable/composed client-side elsewhere in this
        // feature (Orders, not POS, trusts the submitted price rather
        // than re-deriving it from the live Product row).
        const price =
          product.price + unit.options.reduce((sum, o) => sum + o.priceAdjustment, 0);
        const result = await addItemToOpenOrder({
          orderId: currentOrderId ?? undefined,
          tableId,
          type: mode,
          waiterId: waiterId ?? undefined,
          item: { productId: product.id, quantity: unit.quantity, price, options: unit.options },
        });
        if (result.error) {
          toast.error(result.error);
          return;
        }
        if (result.orderId) {
          currentOrderId = result.orderId;
          setOrderId(result.orderId);
        }
        if (result.items) setItems(result.items);
      }
    });
  }

  function handleAddProduct(product: PosProduct) {
    startTransition(async () => {
      const groups = await fetchProductOptionGroupsAction(product.id);
      if (groups.length > 0) {
        setOptionPicker({ product, groups });
        return;
      }
      addWithOptions(product, undefined);
    });
  }

  function handleDecrementProduct(product: PosProduct) {
    // The grid's quick decrement has no notion of "which variant" — it
    // targets the most recently added line for this product, which is
    // correct for the common case (a product with no options only ever has
    // one line) and a reasonable default otherwise.
    const matching = items.filter((line) => line.productId === product.id);
    const target = matching[matching.length - 1];
    if (!target || !orderId) return;
    handleSetLineQuantity(target.id, target.quantity - 1);
  }

  function handleSetLineQuantity(lineId: string, quantity: number) {
    if (!orderId) return;
    startTransition(async () => {
      const result = await setOpenOrderLineQuantity(orderId, lineId, quantity);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setItems(result.items ?? []);
      if ((result.items ?? []).length === 0) setOrderId(null);
    });
  }

  const categoryRailPanel = (
    <CategoryRail
      initial={initialCategories}
      activeId={categoryId}
      onSelect={(id, name) => {
        setCategoryId(id);
        setCategoryName(name);
      }}
      onBarcodeScan={() => {}}
    />
  );

  const productGridPanel = (
    <ProductGrid
      initial={initialProducts}
      categoryId={categoryId}
      query=""
      categoryName={categoryName}
      cartQuantities={cartQuantities}
      onAddProduct={handleAddProduct}
      onIncrement={handleAddProduct}
      onDecrement={handleDecrementProduct}
    />
  );

  const currentOrderPanel = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <h2 className="text-sm font-semibold">{t.tables.caisse.currentOrderTitle}</h2>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {items.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {t.tables.caisse.emptyCartMessage}
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((line) => (
              <li key={line.id} className="flex items-center gap-2 rounded-lg border p-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{line.productName}</p>
                  {line.options.length > 0 && (
                    <p className="truncate text-xs text-muted-foreground">
                      {line.options.map((option) => option.optionName).join(", ")}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(line.price, locale)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => handleSetLineQuantity(line.id, line.quantity - 1)}
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
                    disabled={isPending}
                    onClick={() => handleSetLineQuantity(line.id, line.quantity + 1)}
                  >
                    <Plus />
                  </Button>
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() => handleSetLineQuantity(line.id, 0)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="space-y-3 border-t p-4">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span>{t.tables.caisse.totalLabel}</span>
          <span>{formatCurrency(total, locale)}</span>
        </div>
        <Button
          className="w-full cursor-pointer"
          disabled={!orderId || items.length === 0 || isPending}
          onClick={() => setCheckoutOpen(true)}
        >
          <Wallet className="size-4" />
          {t.tables.caisse.checkoutButton}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-muted/30">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4">
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={<Link href="/caisse/cafe" />}
        >
          <ArrowRight className="size-4 rtl:rotate-180" />
        </Button>
        <BrandMark size="sm" logoUrl={logoUrl} />
        <h1 className="truncate text-sm font-semibold">
          {mode === "DINE_IN"
            ? `${t.tables.caisse.tableLabel} ${tableName ?? ""}`
            : t.tables.caisse.takeawayLabel}
        </h1>

        {changeWaiterHref && (
          <Link
            href={changeWaiterHref}
            className="flex shrink-0 items-center gap-1 rounded-full border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {waiterName ?? t.waiters.pickerTitle}
            <Pencil className="size-3" />
          </Link>
        )}

        <div className="ms-auto flex shrink-0 items-center gap-2">
          <LocaleSwitcher />
          <AccountMenu adminName={adminName} canDashboard={canDashboard} />
        </div>
      </header>

      {isDesktop ? (
        <ResizablePanelGroup
          id="cafe-order-panels-v1"
          className="min-h-0 flex-1 p-3"
          defaultLayout={panelLayout}
          onLayoutChanged={onPanelLayoutChanged}
        >
          <ResizablePanel
            id="categories"
            defaultSize={`${panelLayout?.categories ?? 18}%`}
            minSize="10%"
            maxSize="30%"
          >
            {categoryRailPanel}
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel id="products" defaultSize={`${panelLayout?.products ?? 52}%`} minSize="30%">
            {productGridPanel}
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel
            id="order"
            defaultSize={`${panelLayout?.order ?? 30}%`}
            minSize="18%"
            maxSize="45%"
          >
            {currentOrderPanel}
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3">
          <div className="min-h-0">{productGridPanel}</div>
          {currentOrderPanel}
        </div>
      )}

      {orderId && (
        <CheckoutDialog
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          orderId={orderId}
          total={total}
          language={langFromLocale(locale)}
          onSuccess={(invoiceId) => {
            toast.success(t.tables.caisse.checkoutSuccessToast);
            router.push(`/caisse/invoices/${invoiceId}/print`);
          }}
        />
      )}

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
            addUnitsWithOptions(optionPicker.product, units);
            setOptionPicker(null);
          }}
        />
      )}
    </div>
  );
}

function CheckoutDialog({
  open,
  onOpenChange,
  orderId,
  total,
  language,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  total: number;
  language: InvoiceLanguage;
  onSuccess: (invoiceId: string) => void;
}) {
  const { t } = useLocale();
  const [isPending, startTransition] = useTransition();
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [amount, setAmount] = useState(String(total));

  function handleConfirm() {
    startTransition(async () => {
      const result = await getOrCreateInvoiceForOrder(orderId, {
        language,
        payments: [{ method, amount: Number(amount) || 0 }],
        redirect: false,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      onOpenChange(false);
      if (result.invoiceId) onSuccess(result.invoiceId);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.tables.caisse.checkoutTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t.tables.caisse.paymentMethodLabel}</Label>
            <Select value={method} onValueChange={(value) => value && setMethod(value as PaymentMethod)}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value: string) =>
                    t.statusLabels.paymentMethod[value as keyof typeof t.statusLabels.paymentMethod] ??
                    value
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t.statusLabels.paymentMethod[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="checkout-amount">{t.tables.caisse.amountLabel}</Label>
            <Input
              id="checkout-amount"
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <Button
            className="w-full cursor-pointer"
            disabled={isPending}
            onClick={handleConfirm}
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {t.tables.caisse.confirmPayButton}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
