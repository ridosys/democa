"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  createOptionGroup,
  updateOptionGroup,
  deleteOptionGroup,
  createProductOption,
  deleteProductOption,
} from "@/features/product-options/actions";
import { useLocale } from "@/i18n/locale-provider";
import { formatCurrency } from "@/lib/currency";
import type { ProductOptionGroupsView } from "@/features/product-options/queries";

export function OptionGroupEditor({
  productId,
  groups,
}: {
  productId: string;
  groups: ProductOptionGroupsView;
}) {
  const { locale, t } = useLocale();
  const [isPending, startTransition] = useTransition();
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupRequired, setNewGroupRequired] = useState(false);
  const [newGroupMultiple, setNewGroupMultiple] = useState(false);

  function handleAddGroup() {
    if (!newGroupName.trim()) return;
    startTransition(async () => {
      const result = await createOptionGroup(productId, {
        name: newGroupName.trim(),
        isRequired: newGroupRequired,
        allowMultiple: newGroupMultiple,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setNewGroupName("");
      setNewGroupRequired(false);
      setNewGroupMultiple(false);
    });
  }

  function handleDeleteGroup(id: string) {
    startTransition(async () => {
      const result = await deleteOptionGroup(id);
      if (result.error) toast.error(result.error);
    });
  }

  function handleToggleGroupFlag(
    group: ProductOptionGroupsView[number],
    flag: "isRequired" | "allowMultiple",
  ) {
    startTransition(async () => {
      const result = await updateOptionGroup(group.id, {
        name: group.name,
        isRequired: flag === "isRequired" ? !group.isRequired : group.isRequired,
        allowMultiple: flag === "allowMultiple" ? !group.allowMultiple : group.allowMultiple,
      });
      if (result.error) toast.error(result.error);
    });
  }

  return (
    <div className="space-y-4">
      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t.productOptions.emptyGroupsMessage}
        </p>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <div key={group.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{group.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={isPending}
                  onClick={() => handleDeleteGroup(group.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <div className="mt-2 flex items-center gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={group.isRequired}
                    disabled={isPending}
                    onCheckedChange={() => handleToggleGroupFlag(group, "isRequired")}
                  />
                  {t.productOptions.requiredLabel}
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={group.allowMultiple}
                    disabled={isPending}
                    onCheckedChange={() => handleToggleGroupFlag(group, "allowMultiple")}
                  />
                  {t.productOptions.allowMultipleLabel}
                </label>
              </div>

              <div className="mt-3 space-y-2">
                {group.options.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {t.productOptions.emptyOptionsMessage}
                  </p>
                ) : (
                  group.options.map((option) => (
                    <div
                      key={option.id}
                      className="flex items-center justify-between gap-2 rounded border bg-muted/30 px-2.5 py-1.5"
                    >
                      <span className="text-sm">{option.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {option.priceAdjustment >= 0 ? "+" : ""}
                          {formatCurrency(option.priceAdjustment, locale)}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          disabled={isPending}
                          onClick={() =>
                            startTransition(async () => {
                              const result = await deleteProductOption(option.id);
                              if (result.error) toast.error(result.error);
                            })
                          }
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <AddOptionRow
                groupId={group.id}
                disabled={isPending}
                onAdd={(name, priceAdjustment) =>
                  startTransition(async () => {
                    const result = await createProductOption(group.id, {
                      name,
                      priceAdjustment,
                      isActive: true,
                    });
                    if (result.error) toast.error(result.error);
                  })
                }
              />
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2 rounded-lg border border-dashed p-3">
        <Label>{t.productOptions.groupNameLabel}</Label>
        <Input
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          placeholder={t.productOptions.groupNameLabel}
        />
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={newGroupRequired}
              onCheckedChange={setNewGroupRequired}
            />
            {t.productOptions.requiredLabel}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={newGroupMultiple}
              onCheckedChange={setNewGroupMultiple}
            />
            {t.productOptions.allowMultipleLabel}
          </label>
        </div>
        <Button
          type="button"
          size="sm"
          className="cursor-pointer"
          disabled={isPending || !newGroupName.trim()}
          onClick={handleAddGroup}
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          {t.productOptions.addGroupButton}
        </Button>
      </div>
    </div>
  );
}

function AddOptionRow({
  disabled,
  onAdd,
}: {
  groupId: string;
  disabled: boolean;
  onAdd: (name: string, priceAdjustment: number) => void;
}) {
  const { t } = useLocale();
  const [name, setName] = useState("");
  const [priceAdjustment, setPriceAdjustment] = useState("0");

  function submit() {
    if (!name.trim()) return;
    onAdd(name.trim(), Number(priceAdjustment) || 0);
    setName("");
    setPriceAdjustment("0");
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t.productOptions.optionNameLabel}
        className="h-8 flex-1"
      />
      <Input
        type="number"
        step="0.01"
        value={priceAdjustment}
        onChange={(e) => setPriceAdjustment(e.target.value)}
        placeholder={t.productOptions.priceAdjustmentLabel}
        className="h-8 w-28"
      />
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        disabled={disabled || !name.trim()}
        onClick={submit}
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );
}
