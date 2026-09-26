/**
 * What the Android printer apps (Thermer, Open ESC/POS Print Service) can
 * print: a sales invoice, a purchase invoice, or a waiter's daily report
 * (one waiter, one day).
 *
 * Plain module (no "server-only"): the print buttons send a PrintDocRef to
 * the server actions, which validate it with parsePrintDocRef.
 */
export const PRINT_DOC_KINDS = ["invoice", "purchase", "waiter-report"] as const;

export type PrintDocKind = (typeof PRINT_DOC_KINDS)[number];

export type PrintDocRef = {
  kind: PrintDocKind;
  id: string;
  /** waiter-report only: the day, as YYYY-MM-DD. */
  date?: string;
};

const ID = /^[a-z0-9]{10,40}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isPrintDocKind(value: unknown): value is PrintDocKind {
  return typeof value === "string" && (PRINT_DOC_KINDS as readonly string[]).includes(value);
}

export function parsePrintDocRef(value: unknown): PrintDocRef | null {
  if (typeof value !== "object" || value === null) return null;
  const { kind, id, date } = value as Record<string, unknown>;
  if (!isPrintDocKind(kind) || typeof id !== "string" || !ID.test(id)) return null;
  if (kind !== "waiter-report") return { kind, id };
  if (typeof date !== "string" || !DATE.test(date)) return null;
  return { kind, id, date };
}

/** What a print token is signed for — the exact document, nothing else. */
export function printDocSubject(ref: PrintDocRef): string {
  return ref.kind === "waiter-report" ? `${ref.kind}:${ref.id}:${ref.date}` : `${ref.kind}:${ref.id}`;
}
