import "server-only";
import { headers } from "next/headers";

/** The current request's own origin, derived from its Host header — used to
 * build the QR ordering URL printed on a table card. Never trust a
 * client-supplied header for anything security-sensitive; this is used only
 * to construct a link, not to authorize anything. */
export async function getRequestOrigin(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}
