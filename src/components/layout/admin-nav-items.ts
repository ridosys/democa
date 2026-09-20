import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tags,
  Users,
  ShoppingCart,
  Boxes,
  Truck,
  ClipboardList,
  Receipt,
  BarChart3,
  FileText,
  RotateCcw,
  Undo2,
  UserCog,
  ShieldCheck,
  Palette,
  LayoutGrid,
  Store,
  Contact,
  type LucideIcon,
} from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries";
import type { PermissionKey } from "@/lib/permission-modules";
import type { FeatureKey } from "@/lib/feature-catalog";

export type AdminNavBadgeKey = "pendingOrders" | "lowStock" | "unpaidInvoices";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badgeKey?: AdminNavBadgeKey;
  /** Nav item is only shown when the current admin holds this permission
   * (or has full access). Omitted entirely means always visible — only the
   * dashboard overview link itself has no gate. */
  permission?: PermissionKey;
  /** Nav item is only shown when this feature is enabled for the current
   * installation (see src/lib/feature-catalog.ts). Omitted means always
   * visible w.r.t. features — independent of, and in addition to,
   * `permission`. */
  requiredFeature?: FeatureKey;
};

export type AdminNavGroup = {
  label?: string;
  items: AdminNavItem[];
};

function canSee(
  permissions: PermissionKey[] | "full",
  features: Record<FeatureKey, boolean>,
  permission?: PermissionKey,
  requiredFeature?: FeatureKey,
): boolean {
  if (permission && permissions !== "full" && !permissions.includes(permission)) {
    return false;
  }
  if (requiredFeature && !features[requiredFeature]) return false;
  return true;
}

export function getAdminNavGroups(
  t: Dictionary,
  permissions: PermissionKey[] | "full",
  features: Record<FeatureKey, boolean>,
  /** Deployment-level kill switch (see src/lib/env-features.ts) — computed
   * server-side and passed in rather than read here, since this function
   * also runs inside the client AppSidebar bundle where a non-public env
   * var would just read as undefined. */
  businessSettingsManagementEnabled: boolean,
): AdminNavGroup[] {
  const groups: AdminNavGroup[] = [
    {
      items: [
        {
          href: "/dashboard",
          label: t.admin.dashboard,
          icon: LayoutDashboard,
          permission: "DASHBOARD_VIEW",
        },
      ],
    },
    {
      label: t.admin.groups.catalog,
      items: [
        {
          href: "/dashboard/products",
          label: t.admin.products,
          icon: Package,
          permission: "PRODUCTS_VIEW",
        },
        {
          href: "/dashboard/categories",
          label: t.admin.categories,
          icon: FolderTree,
          permission: "PRODUCTS_VIEW",
        },
        {
          href: "/dashboard/brands",
          label: t.admin.brands,
          icon: Tags,
          permission: "PRODUCTS_VIEW",
        },
      ],
    },
    {
      label: t.admin.groups.sales,
      items: [
        {
          href: "/dashboard/customers",
          label: t.admin.customers,
          icon: Users,
          permission: "CUSTOMERS_VIEW",
          requiredFeature: "CUSTOMERS",
        },
        {
          href: "/dashboard/orders",
          label: t.admin.orders,
          icon: ShoppingCart,
          badgeKey: "pendingOrders",
          permission: "ORDERS_VIEW",
        },
        {
          href: "/dashboard/tables",
          label: t.admin.tables,
          icon: LayoutGrid,
          permission: "ORDERS_VIEW",
          requiredFeature: "TABLES",
        },
        {
          href: "/dashboard/waiters",
          label: t.admin.waiters,
          icon: Contact,
          permission: "ORDERS_VIEW",
          requiredFeature: "WAITERS",
        },
        {
          href: "/dashboard/invoices",
          label: t.admin.invoices,
          icon: FileText,
          badgeKey: "unpaidInvoices",
          permission: "INVOICES_VIEW",
        },
        {
          href: "/dashboard/sales-returns",
          label: t.returns.salesTitle,
          icon: RotateCcw,
          permission: "RETURNS_VIEW",
        },
      ],
    },
    {
      label: t.admin.groups.inventory,
      items: [
        {
          href: "/dashboard/inventory",
          label: t.admin.inventory,
          icon: Boxes,
          badgeKey: "lowStock",
          permission: "INVENTORY_VIEW",
        },
        {
          href: "/dashboard/suppliers",
          label: t.admin.suppliers,
          icon: Truck,
          permission: "SUPPLIERS_VIEW",
        },
        {
          href: "/dashboard/purchases",
          label: t.admin.purchases,
          icon: ClipboardList,
          permission: "PURCHASES_VIEW",
        },
        {
          href: "/dashboard/purchase-returns",
          label: t.returns.purchaseTitle,
          icon: Undo2,
          permission: "RETURNS_VIEW",
        },
      ],
    },
    {
      label: t.admin.groups.finance,
      items: [
        {
          href: "/dashboard/expenses",
          label: t.admin.expenses,
          icon: Receipt,
          permission: "EXPENSES_VIEW",
        },
        {
          href: "/dashboard/reports",
          label: t.admin.reports,
          icon: BarChart3,
          permission: "REPORTS_VIEW",
        },
      ],
    },
    {
      label: t.admin.groups.settings,
      items: [
        {
          href: "/dashboard/settings/users",
          label: t.admin.users,
          icon: UserCog,
          permission: "USERS_MANAGE",
        },
        {
          href: "/dashboard/settings/roles",
          label: t.admin.roles,
          icon: ShieldCheck,
          permission: "USERS_MANAGE",
        },
        {
          href: "/dashboard/settings/appearance",
          label: t.admin.appearance,
          icon: Palette,
          permission: "SETTINGS_MANAGE",
        },
        ...(businessSettingsManagementEnabled
          ? [
              {
                href: "/dashboard/settings/business",
                label: t.admin.business,
                icon: Store,
                permission: "SETTINGS_MANAGE" as const,
                // No requiredFeature here on purpose — this is the page
                // that turns Cafe features on in the first place, gating
                // it behind a feature would be self-locking for a fresh
                // RETAIL install. businessSettingsManagementEnabled is a
                // separate, deployment-level (env var) switch, not an
                // admin-editable FeatureKey, so it can't self-lock the
                // same way.
              },
            ]
          : []),
      ],
    },
  ];

  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        canSee(permissions, features, item.permission, item.requiredFeature),
      ),
    }))
    .filter((group) => group.items.length > 0);
}

/** The first page this admin can actually reach, in the same priority
 * order as the sidebar itself — used wherever the app would otherwise
 * blindly send someone to `/dashboard` regardless of whether they can see
 * it (post-login redirect, the access-denied page's "back" link). Returns
 * `null` only for a role with no permissions granted at all, in which case
 * the caller should fall back to the access-denied page — there's
 * genuinely nowhere else to send them. */
export function getFirstAccessibleHref(
  t: Dictionary,
  permissions: PermissionKey[] | "full",
  features: Record<FeatureKey, boolean>,
  businessSettingsManagementEnabled: boolean,
): string | null {
  const groups = getAdminNavGroups(t, permissions, features, businessSettingsManagementEnabled);
  const firstDashboardHref = groups[0]?.items[0]?.href;
  if (firstDashboardHref) return firstDashboardHref;
  // La Caisse is intentionally absent from the sidebar, but a POS-only role
  // still needs somewhere to land instead of the access-denied dead end —
  // whichever Caisse is actually reachable for this installation, since
  // requireFeature() on the target page would otherwise immediately bounce
  // them straight back to access-denied.
  if (canSee(permissions, features, "POS_VIEW")) {
    if (features.CAFE_CAISSE) return "/caisse/cafe";
    if (features.RETAIL_CAISSE) return "/caisse";
  }
  return null;
}
