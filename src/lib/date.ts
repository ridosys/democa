/** Formats a date with minute precision, matching the "fr-FR" date
 * convention already used everywhere else in the app regardless of UI
 * locale (see AGENTS.md / established codebase pattern). */
export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Day-only counterpart of formatDateTime, for lists bucketed by day (e.g.
 * a table profile's daily occupancy breakdown) where the time is noise. */
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** UTC-safe "YYYY-MM-DD" — the value <input type="date"> expects/emits,
 * and the inverse of parsing a date-only string with `new Date(str)`
 * (which the spec always interprets as UTC midnight). Never use
 * toLocaleDateString or local getters here, or the value drifts by the
 * server's UTC offset. */
export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Parses an <input type="date"> value ("YYYY-MM-DD") as UTC midnight,
 * matching how Postgres's date_trunc('day', ...) buckets a naive
 * "timestamp without time zone" column whose DB session runs in GMT (see
 * analytics-queries.ts's truncExpr comment) — never `new Date(y, m, d)`,
 * which reads as the server's local timezone and silently shifts the
 * boundary by its UTC offset. */
export function parseDateInputValue(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}
