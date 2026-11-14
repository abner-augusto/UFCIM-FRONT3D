export const CAMPUS_TIME_ZONE = 'America/Fortaleza';
export const CAMPUS_UTC_OFFSET = '-03:00';

export function campusISODate(d: Date = new Date()): string {
  return campusNow(d).date;
}

const campusFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CAMPUS_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

export function campusNow(now: Date = new Date()): { date: string; hour: number; minute: number } {
  const parts = Object.fromEntries(campusFormatter.formatToParts(now).map((part) => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour), minute: Number(parts.minute) };
}

export function campusInstant(date: string, time: string): Date {
  const normalizedDate = time === '24:00' ? addLocalDays(date, 1) : date;
  return new Date(`${normalizedDate}T${time === '24:00' ? '00:00' : time}:00${CAMPUS_UTC_OFFSET}`);
}

/** Add calendar days to a date-only ISO value without converting through UTC. */
export function addLocalDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function defaultReportPeriod(now: Date = new Date(), days = 30) {
  const endDate = campusISODate(now);
  return { startDate: addLocalDays(endDate, 1 - days), endDate };
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
