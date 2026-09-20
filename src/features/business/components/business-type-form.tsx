"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  setActiveBusinessType,
  createBusinessType,
  renameBusinessType,
  deleteBusinessType,
} from "@/features/business/actions";
import { useLocale } from "@/i18n/locale-provider";
import type { BusinessTypeRow } from "@/features/business/queries";

export function BusinessTypeForm({
  businessTypes,
  activeBusinessTypeId,
}: {
  businessTypes: BusinessTypeRow[];
  activeBusinessTypeId: string | null;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const [isPending, startTransition] = useTransition();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [newName, setNewName] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  function handleSetActive(id: string) {
    startTransition(async () => {
      const result = await setActiveBusinessType({ businessTypeId: id });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t.settings.business.toastTypeUpdated);
      router.refresh();
    });
  }

  function handleCreate() {
    if (!newName.trim()) return;
    startTransition(async () => {
      const result = await createBusinessType({ name: newName.trim() });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t.settings.business.toastTypeCreated);
      setNewName("");
      setAddOpen(false);
      router.refresh();
    });
  }

  function handleRename(id: string) {
    if (!renameValue.trim()) return;
    startTransition(async () => {
      const result = await renameBusinessType(id, { name: renameValue.trim() });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t.settings.business.toastTypeRenamed);
      setRenamingId(null);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteBusinessType(id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t.settings.business.toastTypeDeleted);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {businessTypes.map((businessType) => {
          const isActive = businessType.id === activeBusinessTypeId;
          const isRenaming = renamingId === businessType.id;
          return (
            <li
              key={businessType.id}
              className="flex items-center gap-2 rounded-lg border p-2.5"
            >
              {isRenaming ? (
                <>
                  <Input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    className="h-8 flex-1"
                    disabled={isPending}
                  />
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() => handleRename(businessType.id)}
                  >
                    <Check className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() => setRenamingId(null)}
                  >
                    <X className="size-4" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 truncate text-sm font-medium">
                    {businessType.name}
                  </span>
                  {isActive && (
                    <Badge>{t.settings.business.activeTypeBadge}</Badge>
                  )}
                  {businessType.isSystem && (
                    <Badge variant="outline">{t.settings.business.systemTypeBadge}</Badge>
                  )}
                  {!isActive && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      className="cursor-pointer"
                      onClick={() => handleSetActive(businessType.id)}
                    >
                      {t.settings.business.setActiveButton}
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() => {
                      setRenamingId(businessType.id);
                      setRenameValue(businessType.name);
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  {!businessType.isSystem && !isActive && (
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            disabled={isPending}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        }
                      />
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t.common.confirmDeleteTitle}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t.settings.business.deleteTypeConfirmDescription}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(businessType.id)}>
                            {t.common.delete}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>

      {addOpen ? (
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t.settings.business.addTypeNamePlaceholder}
            className="h-8 flex-1"
            disabled={isPending}
          />
          <Button
            type="button"
            size="sm"
            disabled={isPending}
            className="cursor-pointer"
            onClick={handleCreate}
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {t.common.add}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={() => {
              setAddOpen(false);
              setNewName("");
            }}
          >
            {t.common.cancel}
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="cursor-pointer"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="size-4" />
          {t.settings.business.addTypeButton}
        </Button>
      )}
    </div>
  );
}
