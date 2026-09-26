import "server-only";
import { getSystemSettings, type SystemSettingsData } from "@/features/settings/queries";
import { parsePrintDocRef, printDocSubject, type PrintDocRef } from "@/lib/print-document";
import { verifyPrintToken } from "@/lib/print-token";

export type PrintRequestResult =
  | { ok: true; ref: PrintDocRef; settings: SystemSettingsData; token: string }
  | { ok: false; status: number; error: string };

/**
 * Access check shared by the printer-app endpoints (receipt JSON and its
 * image). The app calls them without the browser's session, so access is
 * granted only by the short-lived `?token=` issued for this exact document
 * by createBluetoothPrintLink — never publicly.
 */
export async function loadPrintRequest(
  kind: string,
  id: string,
  searchParams: URLSearchParams,
): Promise<PrintRequestResult> {
  const ref = parsePrintDocRef({ kind, id, date: searchParams.get("date") ?? undefined });
  if (!ref) return { ok: false, status: 400, error: "Invalid document" };

  const token = searchParams.get("token");
  const tokenState = verifyPrintToken(printDocSubject(ref), token);
  if (tokenState === "expired") return { ok: false, status: 401, error: "Print link expired" };
  if (tokenState !== "ok" || !token) {
    return { ok: false, status: 401, error: "Invalid print link" };
  }

  const settings = await getSystemSettings();
  if (settings.printMethod !== "thermer") {
    return { ok: false, status: 403, error: "Printer app printing is disabled" };
  }
  return { ok: true, ref, settings, token };
}

/** lang / paper / text size the print page asked for (validated later). */
export function printOptionsFrom(searchParams: URLSearchParams) {
  return {
    lang: searchParams.get("lang") ?? undefined,
    paper: searchParams.get("paper") ?? undefined,
    textSize: searchParams.get("text") ?? undefined,
  };
}
