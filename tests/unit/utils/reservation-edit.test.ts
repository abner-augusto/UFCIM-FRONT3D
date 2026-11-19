import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { useTimeRangePicker } from '@/composables/useTimeRangePicker';
import {
  applyUpdatedReservation,
  buildReservationUpdate,
  freeOwnReservation,
  hasReservationStarted,
  reservationEditDraft,
  withResolvedRequester,
} from '@/utils/reservation-edit';
import { emptyRequester } from '@/utils/reservation-requester';
import { minutesToTime, timeToMinutes } from '@/utils/slots';
import type { AvailabilitySlot, Reservation } from '@/types/reservation';

const OWN_ID = 'own-reservation';

function reservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: OWN_ID,
    spaceId: 's1',
    userId: 'u1',
    date: '2026-10-20',
    startTime: '09:00',
    endTime: '10:30',
    status: 'confirmed',
    changeOrigin: null,
    recurrenceId: null,
    purpose: 'class',
    description: 'Aula de projeto',
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
    ...overrides,
  };
}

function reservedBy(id: string) {
  return {
    id,
    purpose: 'class',
    description: null,
    isRecurring: false,
    isSelf: id === OWN_ID,
    author: { displayName: 'Você', role: 'professor' },
  };
}

/** 07:00–22:00 in half hours; own reservation 09:00–10:30, someone else's 11:00–12:00. */
function day(): AvailabilitySlot[] {
  const slots: AvailabilitySlot[] = [];
  for (let m = timeToMinutes('07:00'); m < timeToMinutes('22:00'); m += 30) {
    const startTime = minutesToTime(m);
    const slot: AvailabilitySlot = { startTime, endTime: minutesToTime(m + 30), status: 'available' };
    if (startTime >= '09:00' && startTime < '10:30') Object.assign(slot, { status: 'reserved', reservation: reservedBy(OWN_ID) });
    if (startTime >= '11:00' && startTime < '12:00') Object.assign(slot, { status: 'reserved', reservation: reservedBy('someone-else') });
    slots.push(slot);
  }
  return slots;
}

describe('freeOwnReservation (MEL-023)', () => {
  it("turns the edited reservation's own slots into free ones", () => {
    const slots = freeOwnReservation(day(), OWN_ID);
    const own = slots.filter((s) => s.startTime >= '09:00' && s.startTime < '10:30');

    expect(own.map((s) => s.status)).toEqual(['available', 'available', 'available']);
    expect(own.every((s) => s.reservation === undefined)).toBe(true);
  });

  it("keeps other people's reservations busy", () => {
    const slots = freeOwnReservation(day(), OWN_ID);
    const other = slots.filter((s) => s.startTime >= '11:00' && s.startTime < '12:00');

    expect(other.map((s) => s.status)).toEqual(['reserved', 'reserved']);
  });

  it('returns the slots untouched without an id (create mode)', () => {
    const slots = day();
    expect(freeOwnReservation(slots, null)).toBe(slots);
  });

  it('lets the time picker offer and prefill the current interval', () => {
    const picker = useTimeRangePicker({
      slots: ref(freeOwnReservation(day(), OWN_ID)),
      isBookable: (slot) => slot.status === 'available',
    });

    expect(picker.startOptions.value).toContain('09:00');
    expect(picker.applyRange({ startTime: '09:00', endTime: '10:30' })).toBe(true);
    expect(picker.range.value).toEqual({ startTime: '09:00', endTime: '10:30' });
    // Ends stop where someone else's reservation begins.
    expect(picker.endOptions.value.at(-1)).toBe('11:00');
  });

  it('without freeing, the picker cannot offer the current interval', () => {
    const picker = useTimeRangePicker({
      slots: ref(day()),
      isBookable: (slot) => slot.status === 'available',
    });

    expect(picker.startOptions.value).not.toContain('09:00');
  });
});

describe('reservationEditDraft (MEL-023)', () => {
  it('prefills date, time range and description', () => {
    expect(reservationEditDraft(reservation())).toEqual({
      schedule: { date: '2026-10-20', startTime: '09:00', endTime: '10:30' },
      description: 'Aula de projeto',
    });
  });

  it('uses an empty description when there is none', () => {
    expect(reservationEditDraft(reservation({ description: null })).description).toBe('');
  });
});

describe('buildReservationUpdate (MEL-023)', () => {
  const original = reservation();

  it('returns null when nothing changed', () => {
    expect(
      buildReservationUpdate(original, {
        schedule: { date: '2026-10-20', startTime: '09:00', endTime: '10:30' },
        description: '  Aula de projeto ',
      }),
    ).toBeNull();
  });

  it('sends only the fields that changed', () => {
    expect(
      buildReservationUpdate(original, {
        schedule: { date: '2026-10-20', startTime: '14:00', endTime: '15:00' },
        description: 'Aula de projeto',
      }),
    ).toEqual({ startTime: '14:00', endTime: '15:00' });
  });

  it('sends a trimmed new description, or an empty one to clear it', () => {
    expect(
      buildReservationUpdate(original, {
        schedule: { date: '2026-10-20', startTime: '09:00', endTime: '10:30' },
        description: ' Banca ',
      }),
    ).toEqual({ description: 'Banca' });
    expect(
      buildReservationUpdate(original, {
        schedule: { date: '2026-10-20', startTime: '09:00', endTime: '10:30' },
        description: '',
      }),
    ).toEqual({ description: '' });
  });

  it('sends a new date on its own', () => {
    expect(
      buildReservationUpdate(original, {
        schedule: { date: '2026-10-21', startTime: '09:00', endTime: '10:30' },
        description: 'Aula de projeto',
      }),
    ).toEqual({ date: '2026-10-21' });
  });

  it('includes requester changes and clearing when staff edits requester (#27)', () => {
    const onBehalf = reservation({
      requesterUserId: 'prof-1',
      requester: { userId: 'prof-1', name: 'Dra. Maria Costa' },
      requesterContact: 'maria@ufc.br',
    });
    const unchangedDraft = {
      schedule: { date: '2026-10-20', startTime: '09:00', endTime: '10:30' },
      description: 'Aula de projeto',
      requester: {
        user: { id: 'prof-1', name: 'Dra. Maria Costa', role: '', department: '' },
        query: 'Dra. Maria Costa',
        contact: 'maria@ufc.br',
      },
    };
    expect(buildReservationUpdate(onBehalf, unchangedDraft)).toBeNull();
    expect(buildReservationUpdate(onBehalf, { ...unchangedDraft, requester: emptyRequester() })).toEqual({
      requesterUserId: null,
      requesterName: null,
      requesterContact: null,
    });
  });
});

describe('withResolvedRequester (#27)', () => {
  it('resolves the requester summary for registered, free-text and cleared updates', () => {
    const base = reservation({ requesterUserId: 'prof-1', requester: { userId: 'prof-1', name: 'Dra. Maria Costa' } });
    const cleared = withResolvedRequester(
      { ...base, requester: undefined, requesterUserId: null, requesterName: null, requesterContact: null },
      base,
      emptyRequester(),
    );
    expect(cleared.requester).toBeNull();

    const freeText = withResolvedRequester(
      { ...base, requester: undefined, requesterUserId: null, requesterName: 'CA', requesterContact: '85 3366' },
      base,
      { user: null, query: 'CA', contact: '85 3366' },
    );
    expect(freeText.requester).toEqual({ userId: null, name: 'CA' });
  });
});

describe('applyUpdatedReservation (#27)', () => {
  it('propagates requester changes to non-canceled occurrences of the same series only', () => {
    const occ1 = reservation({ id: 'occ-1', recurrenceId: 's-1', requesterUserId: 'prof-1', requester: { userId: 'prof-1', name: 'Maria' } });
    const occ2 = reservation({ id: 'occ-2', recurrenceId: 's-1', requesterUserId: 'prof-1', requester: { userId: 'prof-1', name: 'Maria' } });
    const occCanceled = reservation({ id: 'occ-3', recurrenceId: 's-1', status: 'canceled', requesterUserId: 'prof-1', requester: { userId: 'prof-1', name: 'Maria' } });
    const updated = { ...occ1, requesterUserId: null, requesterName: 'CA', requesterContact: '85 3366', requester: { userId: null, name: 'CA' } };

    const next = applyUpdatedReservation([occ1, occ2, occCanceled], updated);
    expect(next[0].requester).toEqual({ userId: null, name: 'CA' });
    expect(next[1].requester).toEqual({ userId: null, name: 'CA' });
    expect(next[1].requesterContact).toBe('85 3366');
    expect(next[2].requesterUserId).toBe('prof-1');
  });
});

describe('hasReservationStarted (MEL-023)', () => {
  const r = reservation(); // 2026-10-20 09:00–10:30

  it('is false before the start', () => {
    expect(hasReservationStarted(r, new Date('2026-10-20T08:59:00-03:00'))).toBe(false);
  });

  it('is true at the start and while in progress', () => {
    expect(hasReservationStarted(r, new Date('2026-10-20T09:00:00-03:00'))).toBe(true);
    expect(hasReservationStarted(r, new Date('2026-10-20T10:00:00-03:00'))).toBe(true);
  });

  it('is true after the reservation ended', () => {
    expect(hasReservationStarted(r, new Date('2026-10-21T08:00:00-03:00'))).toBe(true);
  });
});
