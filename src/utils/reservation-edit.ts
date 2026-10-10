import type { AvailabilitySlot, Reservation } from '@/types/reservation';
import type { TimeRange } from '@/utils/slots';

/** What the edit tray holds for a reservation (MEL-023). The space is fixed. */
export interface ReservationEditDraft {
  schedule: TimeRange & { date: string };
  description: string;
}

/** Partial body for `PATCH /reservations/:id`: only what changed. */
export interface ReservationUpdate {
  date?: string;
  startTime?: string;
  endTime?: string;
  description?: string;
}

/**
 * Marks the edited reservation's own slots as free, so the time picker can
 * offer (and keep) its current interval. Availability tags each reserved slot
 * with the reservation id; other reservations stay busy.
 */
export function freeOwnReservation(
  slots: AvailabilitySlot[],
  reservationId: string | null | undefined,
): AvailabilitySlot[] {
  if (!reservationId) return slots;
  return slots.map((slot) => {
    if (slot.status !== 'reserved' || slot.reservation?.id !== reservationId) return slot;
    const { reservation: _own, ...rest } = slot;
    return { ...rest, status: 'available' };
  });
}

export function reservationEditDraft(reservation: Reservation): ReservationEditDraft {
  return {
    schedule: {
      date: reservation.date,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
    },
    description: reservation.description ?? '',
  };
}

/** The changed fields, or null when the draft matches the reservation. */
export function buildReservationUpdate(
  original: Reservation,
  draft: ReservationEditDraft,
): ReservationUpdate | null {
  const update: ReservationUpdate = {};
  const { date, startTime, endTime } = draft.schedule;
  if (date !== original.date) update.date = date;
  if (startTime !== original.startTime) update.startTime = startTime;
  if (endTime !== original.endTime) update.endTime = endTime;

  const description = draft.description.trim();
  if (description !== (original.description ?? '').trim()) update.description = description;

  return Object.keys(update).length ? update : null;
}

/** True from the reservation's start onwards (local time, like the rest of the UI). */
export function hasReservationStarted(reservation: Reservation, now: Date): boolean {
  return new Date(`${reservation.date}T${reservation.startTime}:00`) <= now;
}
