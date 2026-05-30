/**
 * Format a Date as a local-time ISO date string (`YYYY-MM-DD`).
 *
 * Unlike `Date.prototype.toISOString()`, which converts to UTC first, this uses
 * the local calendar day. `toISOString()` rolls the day forward near midnight in
 * negative-offset zones — e.g. at 21h in UTC-3 it is already the next day in UTC,
 * so "today" would wrongly resolve to tomorrow. Always use this for the date the
 * user is meant to see/select.
 */
export function toLocalISODate(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
