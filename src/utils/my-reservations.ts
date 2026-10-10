import type { Reservation } from '@/types/reservation';

/** Trimmed description, or null when empty. */
export function reservationDescription(r: Reservation): string | null {
  const text = r.description?.trim();
  return text ? text : null;
}

/**
 * How a recurring series should present its description: one shared text for
 * the whole series, or per-occurrence text when the occurrences differ.
 */
export function describeSeries(items: Reservation[]): { shared: string | null; varies: boolean } {
  const texts = new Set(items.map(reservationDescription));
  if (texts.size === 1) return { shared: [...texts][0], varies: false };
  return { shared: null, varies: true };
}

// ─── Filtering, grouping and ordering ("Minhas Reservas") ───────────────────

/** `active` = everything except cancelled (the default view). */
export type ReservationStatusFilter = 'active' | 'canceled' | 'all';

export interface MyReservationsFilters {
  spaceId: string | null;
  /** Inclusive ISO date bounds (`YYYY-MM-DD`). */
  from: string | null;
  until: string | null;
  status: ReservationStatusFilter;
}

export const DEFAULT_MY_RESERVATIONS_FILTERS: Readonly<MyReservationsFilters> = Object.freeze({
  spaceId: null,
  from: null,
  until: null,
  status: 'active',
});

export interface ReservationGroup {
  /** recurrenceId for a series, reservation id otherwise. */
  id: string;
  isRecurrent: boolean;
  recurrenceId: string | null;
  /** Visible occurrences, oldest first. */
  items: Reservation[];
  /** The occurrence the summary describes: the next confirmed one, if any. */
  main: Reservation;
}

export interface OrganizedReservations {
  /** Groups with an occurrence still to come, soonest first. */
  upcoming: ReservationGroup[];
  /** Fully finished groups, most recent first. */
  past: ReservationGroup[];
}

/** True once the occurrence's end time has passed (local time). */
export function isReservationPast(r: Reservation, now: Date): boolean {
  const end = r.endTime === '24:00' ? '23:59' : r.endTime;
  return new Date(`${r.date}T${end}:00`) < now;
}

function startKey(r: Reservation): string {
  return `${r.date}T${r.startTime}`;
}

function matchesFilters(r: Reservation, filters: MyReservationsFilters): boolean {
  if (filters.status === 'active' && r.status === 'canceled') return false;
  if (filters.status === 'canceled' && r.status !== 'canceled') return false;
  if (filters.spaceId && r.spaceId !== filters.spaceId) return false;
  if (filters.from && r.date < filters.from) return false;
  if (filters.until && r.date > filters.until) return false;
  return true;
}

/**
 * Filter occurrences, group recurring series, and split the result into
 * upcoming (soonest first) and past (most recent first). Filters apply per
 * occurrence, so a series keeps only its matching dates and disappears when
 * none match.
 */
export function organizeMyReservations(
  reservations: Reservation[],
  filters: MyReservationsFilters,
  now: Date,
): OrganizedReservations {
  const buckets = new Map<string, Reservation[]>();
  for (const r of reservations) {
    if (!matchesFilters(r, filters)) continue;
    const key = r.recurrenceId || r.id;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(r);
    else buckets.set(key, [r]);
  }

  const upcoming: { group: ReservationGroup; key: string }[] = [];
  const past: { group: ReservationGroup; key: string }[] = [];

  for (const [id, items] of buckets) {
    items.sort((a, b) => startKey(a).localeCompare(startKey(b)));
    const pending = items.filter(r => !isReservationPast(r, now));
    const main = pending.find(r => r.status === 'confirmed') ?? pending[0] ?? items[items.length - 1];
    const recurrenceId = items[0].recurrenceId || null;
    const group: ReservationGroup = { id, isRecurrent: !!recurrenceId, recurrenceId, items, main };

    if (pending.length) upcoming.push({ group, key: startKey(pending[0]) });
    else past.push({ group, key: startKey(items[items.length - 1]) });
  }

  upcoming.sort((a, b) => a.key.localeCompare(b.key));
  past.sort((a, b) => b.key.localeCompare(a.key));

  return { upcoming: upcoming.map(e => e.group), past: past.map(e => e.group) };
}

function spaceLabel(r: Reservation): string {
  return r.space?.name || r.space?.number || r.spaceId;
}

/** One option per booked space, sorted by name, for the space filter. */
export function reservationSpaceOptions(reservations: Reservation[]): { value: string; label: string }[] {
  const options = new Map<string, string>();
  for (const r of reservations) {
    if (!options.has(r.spaceId)) options.set(r.spaceId, spaceLabel(r));
  }
  return [...options]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR', { numeric: true }));
}

/** Filters that differ from the default; a from/until range counts once. */
export function countActiveFilters(filters: MyReservationsFilters): number {
  return [
    filters.spaceId,
    filters.from || filters.until,
    filters.status !== DEFAULT_MY_RESERVATIONS_FILTERS.status,
  ].filter(Boolean).length;
}

/** Copy of the list with the given reservations marked as cancelled. */
export function markCanceled(reservations: Reservation[], ids: Iterable<string>): Reservation[] {
  const targets = new Set(ids);
  return reservations.map(r => (targets.has(r.id) ? { ...r, status: 'canceled' as const } : r));
}
