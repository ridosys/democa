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
import { waiterSchema, type WaiterInput } from "@/features/waiters/schema";
import { createWaiter, updateWaiter } from "@/features/waiters/actions";
import { WaiterImageUploader } from "@/features/waiters/components/waiter-image-uploader";
import { useLocale } from "@/i18n/locale-provider";
import { useUnsavedChanges } from "@/components/shared/unsaved-changes";

type WaiterRecord = {
  id: string;
  name: string;
  phone: string | null;
  isActive: boolean;
  imageUrl: string | null;
  imagePublicId: string | null;
} | null;

export function WaiterFormSheet({
  open,
  waiter,
}: {
  open: boolean;
  waiter?: WaiterRecord;
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
    watch,
    formState: { errors, isDirty },
  } = useForm<WaiterInput>({
    resolver: zodResolver(waiterSchema),
    defaultValues: {
      name: waiter?.name ?? "",
      phone: waiter?.phone ?? "",
      isActive: waiter?.isActive ?? true,
      image:
        waiter?.imageUrl && waiter?.imagePublicId
          ? { publicId: waiter.imagePublicId, secureUrl: waiter.imageUrl }
          : null,
    },
  });

  useUnsavedChanges(isDirty, { guardHistory: false });
  const nameValue = watch("name");

  function close() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("new");
    params.delete("edit");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function onSubmit(values: WaiterInput) {
    startTransition(async () => {
      const result = waiter
        ? await updateWaiter(waiter.id, values)
        : await createWaiter(values);

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      toast.success(waiter ? t.waiters.toastUpdated : t.waiters.toastCreated);
      close();
    });
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
      title={waiter ? t.waiters.formTitleEdit : t.waiters.formTitleAdd}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <fieldset disabled={isPending} className="contents space-y-4">
          <Controller
            control={control}
            name="image"
            render={({ field }) => (
              <WaiterImageUploader
                value={field.value ?? null}
                onChange={field.onChange}
                name={nameValue}
                disabled={isPending}
              />
            )}
          />
          <div className="space-y-2">
            <Label htmlFor="waiter-name">{t.waiters.nameLabel}</Label>
            <Input id="waiter-name" {...register("name")} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="waiter-phone">{t.waiters.phoneOptionalLabel}</Label>
            <Input id="waiter-phone" dir="ltr" {...register("phone")} />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
            )}
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="waiter-active">{t.waiters.activeLabel}</Label>
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <Switch
                  id="waiter-active"
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
    </FormSheet>
  );
}
