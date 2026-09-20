"use client";

import { ChevronDown, LayoutDashboard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/features/auth/actions";
import { useLocale } from "@/i18n/locale-provider";

/**
 * The account dropdown shown in every staff Caisse header (Retail POS,
 * Cafe Caisse hub, Cafe order workspace) — an avatar initial + name,
 * "Back to dashboard" (when the role has access), and sign out. Pulled out
 * once it started appearing in more than one of those headers, so they
 * stay visually identical without copy-pasting the dropdown markup.
 */
export function AccountMenu({
  adminName,
  canDashboard,
}: {
  adminName: string;
  canDashboard: boolean;
}) {
  const { t } = useLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button type="button" variant="ghost" size="sm" className="gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">
              {adminName ? adminName.charAt(0) : "?"}
            </span>
            <span className="hidden max-w-24 truncate sm:inline">{adminName}</span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            {adminName}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {canDashboard && (
          <DropdownMenuItem nativeButton={false} render={<a href="/dashboard" />}>
            <LayoutDashboard />
            {t.pos.backToDashboard}
          </DropdownMenuItem>
        )}
        <form action={logout}>
          <DropdownMenuItem
            variant="destructive"
            nativeButton
            render={<button type="submit" className="w-full" />}
          >
            <LogOut />
            {t.pos.signOut}
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
