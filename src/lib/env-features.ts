import "server-only";
import { redirect } from "next/navigation";
import { getDictionary } from "@/i18n/server";

/**
 * Deployment-level kill switch for the Business Type & Feature management
 * page (/dashboard/settings/business) and everything it can mutate —
 * distinct from the DB-backed FeatureKey system that page itself manages
 * (see src/lib/feature-catalog.ts). Some deployments (e.g. a hosted plan
 * where the reseller, not the end customer's admin, decides which
 * features are available) need this entire admin surface to not exist at
 * all, not merely be hidden from the nav — hence an env var rather than a
 * DB row an admin with SETTINGS_MANAGE could just flip back on.
 *
 * Defaults to enabled (every existing deployment keeps working
 * untouched); set the env var to the literal string "false" to disable.
 */
export function isBusinessSettingsManagementEnabled(): boolean {
  return process.env.BUSINESS_SETTINGS_MANAGEMENT_ENABLED !== "false";
}

/** Page guard — mirrors requireFeature()'s redirect-to-access-denied
 * pattern in src/lib/features.ts, reusing the same "feature" reason so it
 * renders the same "not enabled for this installation" message. */
export function requireBusinessSettingsManagementEnabled(): void {
  if (!isBusinessSettingsManagementEnabled()) {
    redirect("/dashboard/access-denied?reason=feature");
  }
}

/** Server Action guard — mirrors requireFeatureForAction()'s shape so
 * every mutation in src/features/business/actions.ts can check it the
 * same way it already checks requirePermission(). */
export async function requireBusinessSettingsManagementForAction(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  if (!isBusinessSettingsManagementEnabled()) {
    const t = await getDictionary();
    return { ok: false, error: t.common.featureDisabledError };
  }
  return { ok: true };
}
