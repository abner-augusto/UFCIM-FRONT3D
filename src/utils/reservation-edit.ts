import { campusInstant } from '@/utils/date';
import type { AvailabilitySlot, RequesterRef, RequesterUpdatePayload, Reservation } from '@/types/reservation';
import type { TimeRange } from '@/utils/slots';
import { requesterDiffPayload, type RequesterSelection } from '@/utils/reservation-requester';

/** What the edit tray holds for a reservation (MEL-023). The space is fixed. */
export interface ReservationEditDraft {
  schedule: TimeRange & { date: string };
  description: string;
  requester?: RequesterSelection | null;
}

/** Partial body for `PATCH /reservations/:id`: only what changed. */
export interface ReservationUpdate extends RequesterUpdatePayload {
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

  if (draft.requester) {
    const requesterPatch = requesterDiffPayload(original, draft.requester);
    if (requesterPatch) Object.assign(update, requesterPatch);
  }

  return Object.keys(update).length ? update : null;
}

export function withResolvedRequester(
  updated: Reservation,
  original: Reservation,
  draftRequester?: RequesterSelection | null,
): Reservation {
  if (updated.requester !== undefined) return updated;
  let requester: RequesterRef | null = null;
  if (updated.requesterUserId) {
    const name = draftRequester?.user?.id === updated.requesterUserId
      ? draftRequester.user.name
      : (original.requester?.name ?? '');
    requester = { userId: updated.requesterUserId, name };
  } else if (updated.requesterName) {
    requester = { userId: null, name: updated.requesterName };
  }
  return { ...updated, requester };
}

export function applyUpdatedReservation(list: Reservation[], updated: Reservation): Reservation[] {
  return list.map((r) => {
    if (r.id === updated.id) return { ...r, ...updated, space: updated.space ?? r.space };
    if (updated.recurrenceId && r.recurrenceId === updated.recurrenceId && r.status !== 'canceled') {
      return {
        ...r,
        requesterUserId: updated.requesterUserId,
        requesterName: updated.requesterName,
        requesterContact: updated.requesterContact,
        requester: updated.requester,
      };
    }
    return r;
  });
}

/** True from the reservation's start onwards (campus time). */
export function hasReservationStarted(reservation: Reservation, now: Date): boolean {
  return campusInstant(reservation.date, reservation.startTime) <= now;
}
