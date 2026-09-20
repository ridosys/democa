"use client";

import { useRef, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useLocale } from "@/i18n/locale-provider";
import { formatCurrency, CURRENCY_LABEL } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/config";
import type { ProductOptionGroupsView } from "@/features/product-options/queries";

/** Purely presentational — the containing <label>'s onClick is the single
 * source of truth for toggling, so this never wires its own handler. Used
 * instead of <Checkbox> for single-select groups so the UI doesn't imply
 * more than one option can be picked (a real UX bug: a "size" group was
 * showing square checkboxes even though only one size is ever kept). */
function RadioDot({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full border transition-all",
        checked ? "border-primary bg-primary" : "border-input bg-transparent",
      )}
    >
      {checked && (
        <span className="size-2 rounded-full bg-primary-foreground" />
      )}
    </span>
  );
}

/** "435+2" / "435-2" style signed formula fragment, currency-less. */
function formulaAdjustment(base: number, adjustment: number, locale: Locale) {
  const sign = adjustment >= 0 ? "+" : "-";
  return `${formatCurrency(base, locale, true)}${sign}${formatCurrency(Math.abs(adjustment), locale, true)}`;
}

export type PickedOption = {
  groupName: string;
  optionName: string;
  priceAdjustment: number;
  optionId?: string;
};

/** One line of the confirmed order — its own option selection and
 * quantity, independent of every other unit. This is what lets someone
 * add "1 small coffee and 1 large coffee" in a single pass: each is its
 * own unit with its own size choice, instead of one shared selection
 * applied to every unit. */
export type ConfirmedUnit = { options: PickedOption[]; quantity: number };

/** A unit being configured in the dialog — same shape as ConfirmedUnit but
 * keyed by groupId -> selected optionIds while the user is picking. */
type DraftUnit = {
  id: number;
  selection: Record<string, string[]>;
  quantity: number;
};

const MAX_QUANTITY = 50;

function unitAdjustment(groups: ProductOptionGroupsView, unit: DraftUnit) {
  return groups
    .flatMap((g) => g.options)
    .filter((o) =>
      Object.values(unit.selection).some((ids) => ids.includes(o.id)),
    )
    .reduce((sum, o) => sum + o.priceAdjustment, 0);
}

export function OptionPickerDialog({
  open,
  onOpenChange,
  productName,
  basePrice,
  groups,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  /** The product's own price, before any option adjustment — needed so the
   * confirm button can show the real total, not just the adjustments. */
  basePrice: number;
  groups: ProductOptionGroupsView;
  onConfirm: (units: ConfirmedUnit[]) => void;
}) {
  const { locale, t } = useLocale();
  const nextUnitId = useRef(1);
  const [units, setUnits] = useState<DraftUnit[]>([
    { id: 0, selection: {}, quantity: 1 },
  ]);

  function reset() {
    nextUnitId.current = 1;
    setUnits([{ id: 0, selection: {}, quantity: 1 }]);
  }

  function toggleUnitOption(
    unitId: number,
    groupId: string,
    optionId: string,
    allowMultiple: boolean,
  ) {
    setUnits((prev) =>
      prev.map((unit) => {
        if (unit.id !== unitId) return unit;
        const current = unit.selection[groupId] ?? [];
        const next = allowMultiple
          ? current.includes(optionId)
            ? current.filter((id) => id !== optionId)
            : [...current, optionId]
          : current.includes(optionId)
            ? []
            : [optionId];
        return { ...unit, selection: { ...unit.selection, [groupId]: next } };
      }),
    );
  }

  function setUnitQuantity(unitId: number, next: number) {
    const clamped = Math.min(MAX_QUANTITY, Math.max(1, next));
    setUnits((prev) =>
      prev.map((unit) =>
        unit.id === unitId ? { ...unit, quantity: clamped } : unit,
      ),
    );
  }

  function addUnit() {
    setUnits((prev) => {
      const last = prev[prev.length - 1];
      const id = nextUnitId.current++;
      return [
        ...prev,
        { id, selection: last ? { ...last.selection } : {}, quantity: 1 },
      ];
    });
  }

  function removeUnit(unitId: number) {
    setUnits((prev) =>
      prev.length <= 1 ? prev : prev.filter((u) => u.id !== unitId),
    );
  }

  function handleConfirm() {
    const confirmed: ConfirmedUnit[] = units.map((unit) => {
      const picked: PickedOption[] = [];
      for (const group of groups) {
        const selectedIds = unit.selection[group.id] ?? [];
        for (const option of group.options) {
          if (selectedIds.includes(option.id)) {
            picked.push({
              groupName: group.name,
              optionName: option.name,
              priceAdjustment: option.priceAdjustment,
              optionId: option.id,
            });
          }
        }
      }
      return { options: picked, quantity: unit.quantity };
    });
    onConfirm(confirmed);
    reset();
    onOpenChange(false);
  }

  const grandTotal = units.reduce(
    (sum, unit) =>
      sum + (basePrice + unitAdjustment(groups, unit)) * unit.quantity,
    0,
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{productName}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] space-y-3 overflow-x-hidden overflow-y-auto pe-1">
          {units.map((unit, index) => {
            const adjustment = unitAdjustment(groups, unit);
            const lineTotal = (basePrice + adjustment) * unit.quantity;
            return (
              <div key={unit.id} className="space-y-4 rounded-xl border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">
                    {t.productOptions.unitLabel} {index + 1}
                  </span>
                  {units.length > 1 && (
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      className="cursor-pointer text-muted-foreground hover:text-destructive"
                      aria-label={t.productOptions.removeUnitLabel}
                      onClick={() => removeUnit(unit.id)}
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>

                {groups.map((group) => (
                  <div key={group.id} className="space-y-2">
                    <Label>{group.name}</Label>
                    <div className="space-y-1.5">
                      {group.options
                        .filter((option) => option.isActive)
                        .map((option) => {
                          const checked = (
                            unit.selection[group.id] ?? []
                          ).includes(option.id);
                          return (
                            <label
                              key={option.id}
                              className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border p-2 text-sm"
                              onClick={
                                group.allowMultiple
                                  ? undefined
                                  : () =>
                                      toggleUnitOption(
                                        unit.id,
                                        group.id,
                                        option.id,
                                        group.allowMultiple,
                                      )
                              }
                            >
                              <span className="flex items-center gap-2">
                                {group.allowMultiple ? (
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={() =>
                                      toggleUnitOption(
                                        unit.id,
                                        group.id,
                                        option.id,
                                        group.allowMultiple,
                                      )
                                    }
                                  />
                                ) : (
                                  <RadioDot checked={checked} />
                                )}
                                {option.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatCurrency(
                                  basePrice + option.priceAdjustment,
                                  locale,
                                  true,
                                )}{" "}
                                (
                                {formulaAdjustment(
                                  basePrice,
                                  option.priceAdjustment,
                                  locale,
                                )}
                                ) {CURRENCY_LABEL[locale]}
                              </span>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between rounded-lg border p-2">
                  <Label className="text-sm">{t.products.quantityLabel}</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="outline"
                      className="cursor-pointer"
                      disabled={unit.quantity <= 1}
                      onClick={() =>
                        setUnitQuantity(unit.id, unit.quantity - 1)
                      }
                    >
                      <Minus className="size-4" />
                    </Button>
                    <span className="min-w-6 text-center text-sm font-semibold tabular-nums">
                      {unit.quantity}
                    </span>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="outline"
                      className="cursor-pointer"
                      disabled={unit.quantity >= MAX_QUANTITY}
                      onClick={() =>
                        setUnitQuantity(unit.id, unit.quantity + 1)
                      }
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg bg-muted/40 p-2 text-center text-xs font-semibold tabular-nums">
                  {unit.quantity}(
                  {formulaAdjustment(basePrice, adjustment, locale)}) ={" "}
                  {formatCurrency(lineTotal, locale)}
                </div>
              </div>
            );
          })}

          <Button
            type="button"
            variant="outline"
            className="w-full cursor-pointer gap-1.5"
            onClick={addUnit}
          >
            <Plus className="size-4" />
            {t.productOptions.addAnotherButton}
          </Button>

          <Button
            className="w-full cursor-pointer hover:scale-101"
            onClick={handleConfirm}
          >
            {t.common.add} {formatCurrency(grandTotal, locale)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
