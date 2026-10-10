import { describe, expect, it } from 'vitest';
import {
  MIN_DURATION_MINUTES,
  SLOT_MINUTES,
  buildEndOptions,
  buildOpenSlots,
  buildStartOptions,
  busyIntervals,
  formatTimeLabel,
  groupSlotsByHour,
  hourlyRoomOccupancy,
  minutesToTime,
  openingSlots,
  slotStartAt,
  timeToMinutes,
} from '@/utils/slots';
import type { AvailabilitySlot } from '@/types/reservation';

type Status = AvailabilitySlot['status'];

/** Half-hour slots from `from` (inclusive) to `to` (exclusive), all `status`. */
function halves(from: string, to: string, status: Status = 'available'): AvailabilitySlot[] {
  const slots: AvailabilitySlot[] = [];
  for (let m = timeToMinutes(from); m < timeToMinutes(to); m += 30) {
    slots.push({ startTime: minutesToTime(m), endTime: minutesToTime(m + 30), status });
  }
  return slots;
}

/** A 07:00–22:00 day with the given occupied ranges. */
function day(...busy: Array<[string, string, Status]>): AvailabilitySlot[] {
  return halves('07:00', '22:00').map((slot) => {
    const hit = busy.find(([from, to]) => slot.startTime >= from && slot.startTime < to);
    return hit ? { ...slot, status: hit[2] } : slot;
  });
}

const isFree = (slot: AvailabilitySlot) => slot.status === 'available';

describe('constants and time helpers', () => {
  it('uses 30-minute slots and a 1-hour minimum', () => {
    expect(SLOT_MINUTES).toBe(30);
    expect(MIN_DURATION_MINUTES).toBe(60);
  });

  it('converts between HH:MM and minutes, including 24:00', () => {
    expect(timeToMinutes('16:30')).toBe(990);
    expect(minutesToTime(990)).toBe('16:30');
    expect(minutesToTime(1440)).toBe('24:00');
  });

  it('formats short pt-BR labels', () => {
    expect(formatTimeLabel('16:00')).toBe('16h');
    expect(formatTimeLabel('16:30')).toBe('16h30');
    expect(formatTimeLabel('07:00')).toBe('07h');
  });

  it('finds the half-hour slot containing a moment', () => {
    expect(slotStartAt(new Date(2099, 0, 1, 10, 40))).toBe('10:30');
    expect(slotStartAt(new Date(2099, 0, 1, 10, 29))).toBe('10:00');
    expect(slotStartAt(new Date(2099, 0, 1, 10, 30))).toBe('10:30');
  });
});

describe('buildStartOptions', () => {
  it('offers every half hour that has at least 1 hour free ahead', () => {
    const slots = day(['08:00', '10:00', 'reserved']);
    const starts = buildStartOptions(slots, isFree);

    expect(starts).toContain('07:00'); // 07:00–08:00 free
    expect(starts).not.toContain('07:30'); // only 30 min before 08:00
    expect(starts).not.toContain('08:00');
    expect(starts).toContain('10:00');
    expect(starts).toContain('16:30');
    expect(starts).toContain('21:00');
    expect(starts).not.toContain('21:30'); // closes at 22:00
  });

  it('skips a 30-minute gap between bookings', () => {
    const slots = day(['13:30', '15:00', 'reserved'], ['15:30', '16:30', 'reserved']);
    const starts = buildStartOptions(slots, isFree);

    expect(starts).not.toContain('15:00');
    expect(starts).toContain('16:30');
    expect(starts).toContain('12:30');
    expect(starts).not.toContain('13:00');
  });

  it('treats blocked and past slots as unavailable', () => {
    const slots = day(['19:00', '20:00', 'blocked']);
    const isPast = (slot: AvailabilitySlot) => slot.endTime <= '10:15'; // now = 10:15
    const starts = buildStartOptions(slots, (slot) => isFree(slot) && !isPast(slot));

    expect(starts[0]).toBe('10:00'); // the in-progress 10:00 slot stays bookable
    expect(starts).not.toContain('09:30');
    expect(starts).not.toContain('18:30');
    expect(starts).toContain('20:00');
  });

  it('does not bridge a closed gap missing from the slots', () => {
    const slots = [...halves('07:00', '07:30'), ...halves('08:00', '09:00')];

    expect(buildStartOptions(slots, isFree)).toEqual(['08:00']);
  });
});

describe('buildEndOptions', () => {
  it('lists ends from start + 1 hour until the next conflict', () => {
    const slots = day(['18:00', '19:00', 'reserved']);

    expect(buildEndOptions(slots, '16:30', isFree)).toEqual(['17:30', '18:00']);
  });

  it('reaches the closing time', () => {
    const slots = day();

    expect(buildEndOptions(slots, '20:00', isFree)).toEqual(['21:00', '21:30', '22:00']);
  });

  it('returns nothing for a start without 1 hour free', () => {
    const slots = day(['17:00', '18:00', 'reserved']);

    expect(buildEndOptions(slots, '16:30', isFree)).toEqual([]);
    expect(buildEndOptions(slots, '08:15', isFree)).toEqual([]);
  });

  it('never offers a 30-minute range', () => {
    const slots = day();
    const ends = buildEndOptions(slots, '16:00', isFree);

    expect(ends).not.toContain('16:30');
    expect(ends[0]).toBe('17:00');
  });

  it('supports ranges that end at 24:00', () => {
    const slots = halves('22:00', '24:00');

    expect(buildEndOptions(slots, '22:30', isFree)).toEqual(['23:30', '24:00']);
  });
});

describe('buildOpenSlots / openingSlots', () => {
  it('builds available half-hour slots for a whole day', () => {
    const slots = buildOpenSlots('00:00', '24:00');

    expect(slots).toHaveLength(48);
    expect(slots[47]).toEqual({ startTime: '23:30', endTime: '24:00', status: 'available' });
  });

  it('derives opening hours from closed hours, defaulting to 07:00–22:00', () => {
    expect(openingSlots('22:00', '07:00')[0].startTime).toBe('07:00');
    expect(openingSlots(null, null).at(-1)?.endTime).toBe('22:00');
    expect(openingSlots('23:00', '06:00')).toHaveLength(34);
  });
});

describe('groupSlotsByHour', () => {
  it('keeps one cell per hour and marks a half-occupied hour as split', () => {
    const slots = day(['16:30', '18:00', 'reserved']);
    const cells = groupSlotsByHour(slots);
    const cell = (start: string) => cells.find((c) => c.startTime === start)!;

    expect(cells).toHaveLength(15);
    expect(cell('16:00')).toMatchObject({ startTime: '16:00', endTime: '17:00', status: 'available', split: true });
    expect(cell('16:00').halves.map((h) => h.status)).toEqual(['available', 'reserved']);
    expect(cell('17:00')).toMatchObject({ status: 'reserved', split: false });
    expect(cell('18:00')).toMatchObject({ status: 'available', split: false });
  });

  it('carries the reservation or blocking detail of a fully occupied hour', () => {
    const slots = day(['10:00', '11:00', 'blocked']).map((slot) =>
      slot.status === 'blocked'
        ? { ...slot, blocking: { id: 'b1', blockType: 'maintenance', reason: 'Projetor', rangeStartDate: '', rangeEndDate: '', author: { displayName: 'x', role: 'staff' } } }
        : slot,
    );
    const cell = groupSlotsByHour(slots).find((c) => c.startTime === '10:00')!;

    expect(cell.status).toBe('blocked');
    expect(cell.blocking?.id).toBe('b1');
  });

  it('prefers blocked over reserved when no half is free', () => {
    const slots = day(['10:00', '10:30', 'reserved'], ['10:30', '11:00', 'blocked']);
    const cell = groupSlotsByHour(slots).find((c) => c.startTime === '10:00')!;

    expect(cell).toMatchObject({ status: 'blocked', split: true });
  });

  it('accepts legacy hourly slots as single-half cells', () => {
    const cells = groupSlotsByHour([{ startTime: '07:00', endTime: '08:00', status: 'available' }]);

    expect(cells).toEqual([
      expect.objectContaining({ startTime: '07:00', endTime: '08:00', status: 'available', split: false }),
    ]);
  });
});

describe('busyIntervals', () => {
  it('merges consecutive occupied slots of the same booking', () => {
    const reservation = { id: 'r1', purpose: 'class', description: 'Banca', isRecurring: false, isSelf: false, author: { displayName: 'x', role: 'professor' } };
    const slots = day(['16:30', '18:00', 'reserved'], ['19:00', '20:00', 'blocked']).map((slot) =>
      slot.status === 'reserved' ? { ...slot, reservation } : slot,
    );

    expect(busyIntervals(slots)).toEqual([
      expect.objectContaining({ startTime: '16:30', endTime: '18:00', status: 'reserved', reservation }),
      expect.objectContaining({ startTime: '19:00', endTime: '20:00', status: 'blocked' }),
    ]);
  });

  it('splits back-to-back bookings with different ids', () => {
    const mk = (id: string) => ({ id, purpose: 'class', description: null, isRecurring: false, isSelf: false, author: { displayName: 'x', role: 'professor' } });
    const slots = day(['10:00', '11:00', 'reserved']).map((slot) =>
      slot.status === 'reserved' ? { ...slot, reservation: mk(slot.startTime < '10:30' ? 'a' : 'b') } : slot,
    );

    expect(busyIntervals(slots).map((i) => [i.startTime, i.endTime])).toEqual([
      ['10:00', '10:30'],
      ['10:30', '11:00'],
    ]);
  });
});

describe('hourlyRoomOccupancy', () => {
  it('aggregates both halves of each hour across rooms', () => {
    const roomA = day(['16:30', '18:00', 'reserved']);
    const roomB = day(['16:00', '17:00', 'blocked']);
    const hours = hourlyRoomOccupancy([roomA, roomB], 16, 18);

    expect(hours).toEqual([
      { hour: '16:00', occupiedHalves: 3, openHalves: 4, roomsInUse: 2, rooms: 2 },
      { hour: '17:00', occupiedHalves: 2, openHalves: 4, roomsInUse: 1, rooms: 2 },
    ]);
  });

  it('ignores closed and non-reservable slots', () => {
    const room = halves('07:00', '08:00', 'not_reservable');

    expect(hourlyRoomOccupancy([room], 7, 8)).toEqual([
      { hour: '07:00', occupiedHalves: 0, openHalves: 0, roomsInUse: 0, rooms: 0 },
    ]);
  });
});
