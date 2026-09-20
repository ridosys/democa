"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { FormSheet } from "@/components/shared/form-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { tableSchema, type TableInput } from "@/features/tables/schema";
import { createTable, updateTable } from "@/features/tables/actions";
import { useLocale } from "@/i18n/locale-provider";
import { useUnsavedChanges } from "@/components/shared/unsaved-changes";
import { TableQrSection } from "@/features/tables/components/table-qr-section";

type TableRecord = {
  id: string;
  name: string;
  seats: number | null;
  isActive: boolean;
  qrToken: string | null;
  qrEnabled: boolean;
} | null;

export function TableFormSheet({
  open,
  table,
  qrOrderingEnabled,
  origin,
}: {
  open: boolean;
  table?: TableRecord;
  qrOrderingEnabled: boolean;
  origin: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const { t } = useLocale();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<TableInput>({
    resolver: zodResolver(tableSchema),
    defaultValues: {
      name: table?.name ?? "",
      seats: table?.seats ?? "",
      isActive: table?.isActive ?? true,
    },
  });

  useUnsavedChanges(isDirty, { guardHistory: false });

  function close() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("new");
    params.delete("edit");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function onSubmit(values: TableInput) {
    startTransition(async () => {
      const result = table
        ? await updateTable(table.id, values)
        : await createTable(values);

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      toast.success(table ? t.tables.toastUpdated : t.tables.toastCreated);
      close();
    });
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
      title={table ? t.tables.formTitleEdit : t.tables.formTitleAdd}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <fieldset disabled={isPending} className="contents space-y-4">
          <div className="space-y-2">
            <Label htmlFor="table-name">{t.tables.nameLabel}</Label>
            <Input id="table-name" {...register("name")} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="table-seats">{t.tables.seatsLabel}</Label>
            <Input
              id="table-seats"
              type="number"
              min={1}
              inputMode="numeric"
              {...register("seats")}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="table-active">{t.tables.activeLabel}</Label>
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <Switch
                  id="table-active"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>
          <Button
            type="submit"
            className="w-full cursor-pointer"
            disabled={isPending}
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {isPending ? t.common.saving : t.common.save}
          </Button>
        </fieldset>
      </form>
      {table && qrOrderingEnabled && (
        <TableQrSection
          tableId={table.id}
          qrToken={table.qrToken}
          qrEnabled={table.qrEnabled}
          origin={origin}
        />
      )}
    </FormSheet>
  );
}
