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
