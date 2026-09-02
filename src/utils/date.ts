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

/** Add calendar days to a date-only ISO value without converting through UTC. */
export function addLocalDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return toLocalISODate(date);
}

/** Date-only ISO (`YYYY-MM-DD`) → "02 de julho de 2026". Anchors to local noon. */
export function formatDateLong(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

/** Date-only ISO → "02/07/2026" or "qui., 02/07/2026" with weekday. Anchors to local noon. */
export function formatDateShort(iso: string, opts: { weekday?: boolean } = {}): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', {
    ...(opts.weekday ? { weekday: 'short' as const } : {}),
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Full timestamp (ISO or `YYYY-MM-DD HH:mm`) → "02/07/2026, 14:30". */
export function formatDateTime(iso: string): string {
  const normalized = iso ? iso.replace(' ', 'T') : '';
  const d = new Date(normalized);
  if (!normalized || isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
