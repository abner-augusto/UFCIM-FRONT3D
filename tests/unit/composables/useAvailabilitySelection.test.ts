import { describe, expect, it } from 'vitest';
import { computed, ref } from 'vue';
import { useAvailabilitySelection, findBookableSubRange } from '@/composables/useAvailabilitySelection';
import type { AvailabilitySlot } from '@/types/reservation';

function makeSlot(startTime: string, status: AvailabilitySlot['status'] = 'available'): AvailabilitySlot {
  const h = parseInt(startTime.split(':')[0], 10);
  const endTime = h === 23 ? '24:00' : `${String(h + 1).padStart(2, '0')}:00`;
  return { startTime, endTime, status };
}

type SlotSpec = [string, AvailabilitySlot['status']?];
function makeAvailability(...specs: SlotSpec[]): AvailabilitySlot[] {
  return specs.map(([time, status]) => makeSlot(time, status));
}

/** Half-hour slots (MEL-024): `[start, status]`, each lasting 30 minutes. */
function makeHalves(...specs: SlotSpec[]): AvailabilitySlot[] {
  return specs.map(([startTime, status = 'available']) => {
    const [h, m] = startTime.split(':').map(Number);
    const end = h * 60 + m + 30;
    const endTime = `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
    return { startTime, endTime, status };
  });
}

function setup(slots: AvailabilitySlot[], selectedDate = '2099-12-31') {
  const availability = ref<AvailabilitySlot[] | null>(slots);
  const date = ref(selectedDate);
  return {
    availability,
    date,
    ...useAvailabilitySelection({
      availability,
      selectedDate: date,
      defaultStartTime: computed(() => '07:00'),
      defaultEndTime: computed(() => '12:00'),
    }),
  };
}

describe('useAvailabilitySelection', () => {
  it('hides closed slots from the visible availability strip', () => {
    const { visibleSlots } = setup(makeAvailability(['06:00', 'closed'], ['07:00'], ['08:00']));

    expect(visibleSlots.value.map((slot) => slot.startTime)).toEqual(['07:00', '08:00']);
  });

  it('selects a single available hour on the first cell click', () => {
    const { visibleSlots, onCellClick, hasUserSelection, startTime, endTime } = setup(
      makeAvailability(['07:00'], ['08:00']),
    );

    onCellClick(visibleSlots.value[0], 0);

    expect(hasUserSelection.value).toBe(true);
    expect(startTime.value).toBe('07:00');
    expect(endTime.value).toBe('08:00');
  });

  it('extends only across a contiguous selectable range', () => {
    const { visibleSlots, onCellClick, startTime, endTime, isInSelectedRange } = setup(
      makeAvailability(['07:00'], ['08:00'], ['09:00']),
    );

    onCellClick(visibleSlots.value[0], 0);
    onCellClick(visibleSlots.value[2], 2);

    expect(startTime.value).toBe('07:00');
    expect(endTime.value).toBe('10:00');
    expect([0, 1, 2].map(isInSelectedRange)).toEqual([true, true, true]);
  });

  it('restarts at clicked hour when extending would cross an unavailable slot', () => {
    const { visibleSlots, onCellClick, startTime, endTime, isInSelectedRange } = setup(
      makeAvailability(['07:00'], ['08:00', 'reserved'], ['09:00']),
    );

    onCellClick(visibleSlots.value[0], 0);
    onCellClick(visibleSlots.value[2], 2);

    expect(startTime.value).toBe('09:00');
    expect(endTime.value).toBe('10:00');
    expect([0, 1, 2].map(isInSelectedRange)).toEqual([false, false, true]);
  });

  it('does not extend across a closed gap hidden from the strip', () => {
    const { visibleSlots, onCellClick, startTime, endTime } = setup(
      makeAvailability(['07:00'], ['08:00', 'closed'], ['09:00']),
    );

    onCellClick(visibleSlots.value[0], 0);
    onCellClick(visibleSlots.value[1], 1);

    expect(startTime.value).toBe('09:00');
    expect(endTime.value).toBe('10:00');
  });

  it('opens reserved or blocked detail without changing the selected range', () => {
    const { visibleSlots, onCellClick, selectedSlot, startTime, endTime } = setup(
      makeAvailability(['07:00'], ['08:00', 'reserved']),
    );

    onCellClick(visibleSlots.value[0], 0);
    onCellClick(visibleSlots.value[1], 1);

    expect(selectedSlot.value?.status).toBe('reserved');
    expect(startTime.value).toBe('07:00');
    expect(endTime.value).toBe('08:00');
  });

  it('falls back to the default range until the user chooses a range', () => {
    const { reserveStartTime, reserveEndTime } = setup(makeAvailability(['07:00']));

    expect(reserveStartTime.value).toBe('07:00');
    expect(reserveEndTime.value).toBe('12:00');
  });

  it('marks a default period unbookable when no future available slot remains in it', () => {
    const { reserveRangeBookable } = setup(makeAvailability(['07:00', 'reserved'], ['08:00', 'blocked']));

    expect(reserveRangeBookable.value).toBe(false);
  });
});

describe('useAvailabilitySelection with half-hour slots (MEL-024)', () => {
  it('shows one cell per hour and splits a half-occupied hour', () => {
    const { visibleSlots } = setup(
      makeHalves(['16:00'], ['16:30', 'reserved'], ['17:00', 'reserved'], ['17:30', 'reserved'], ['18:00'], ['18:30']),
    );

    expect(visibleSlots.value.map((cell) => [cell.startTime, cell.endTime, cell.status, cell.split])).toEqual([
      ['16:00', '17:00', 'available', true],
      ['17:00', '18:00', 'reserved', false],
      ['18:00', '19:00', 'available', false],
    ]);
  });

  it('trims a selection over a half-occupied hour to the free half', () => {
    const { visibleSlots, onCellClick, startTime, endTime, reserveRangeBookable } = setup(
      makeHalves(['16:00', 'reserved'], ['16:30'], ['17:00'], ['17:30'], ['18:00'], ['18:30']),
    );

    onCellClick(visibleSlots.value[0], 0);
    onCellClick(visibleSlots.value[1], 1);

    expect(startTime.value).toBe('16:30');
    expect(endTime.value).toBe('18:00');
    expect(reserveRangeBookable.value).toBe(true);
  });

  it('refuses a selection that leaves less than 1 hour free', () => {
    const { visibleSlots, onCellClick, hasUserSelection, startTime, reserveRangeBookable, reserveStartTime, reserveEndTime } = setup(
      makeHalves(['16:00', 'reserved'], ['16:30'], ['17:00', 'reserved'], ['17:30', 'reserved']),
    );

    onCellClick(visibleSlots.value[0], 0);

    expect(hasUserSelection.value).toBe(true);
    expect(startTime.value).toBeNull();
    expect(reserveRangeBookable.value).toBe(false);
    expect(reserveStartTime.value).toBe('16:00');
    expect(reserveEndTime.value).toBe('17:00');
  });

  it('does not extend across a half-hour conflict in the middle', () => {
    const { visibleSlots, onCellClick, startTime, endTime } = setup(
      makeHalves(['16:00'], ['16:30', 'reserved'], ['17:00'], ['17:30']),
    );

    onCellClick(visibleSlots.value[0], 0);
    onCellClick(visibleSlots.value[1], 1);

    // 16:00–16:30 and 17:00–18:00 are not contiguous: restart at the clicked hour.
    expect(startTime.value).toBe('17:00');
    expect(endTime.value).toBe('18:00');
  });

  it('keeps a fully occupied hour as a detail cell', () => {
    const { visibleSlots, onCellClick, selectedSlot, hasUserSelection } = setup(
      makeHalves(['16:00', 'reserved'], ['16:30', 'reserved']),
    );

    onCellClick(visibleSlots.value[0], 0);

    expect(selectedSlot.value?.status).toBe('reserved');
    expect(hasUserSelection.value).toBe(false);
  });
});

describe('findBookableSubRange', () => {
  it('BUG-017 regression: trims past slots from the start, returns remaining bookable sub-range', () => {
    // Slots 19-20, 20-21, 21-22; isPast only for the 19-20 slot
    const slots = makeAvailability(['19:00'], ['20:00'], ['21:00']);
    const isPast = (slot: AvailabilitySlot) => slot.startTime === '19:00';
    const range = { startTime: '19:00', endTime: '22:00' };

    const result = findBookableSubRange(slots, range, isPast);

    expect(result).toEqual({ startIdx: 1, endIdx: 2 }); // 20:00–22:00
  });

  it('future date with full range free returns the entire range', () => {
    const slots = makeAvailability(['19:00'], ['20:00'], ['21:00']);
    const isPast = () => false;
    const range = { startTime: '19:00', endTime: '22:00' };

    const result = findBookableSubRange(slots, range, isPast);

    expect(result).toEqual({ startIdx: 0, endIdx: 2 });
  });

  it('returns null when nothing is bookable', () => {
    const slots = makeAvailability(['19:00', 'reserved'], ['20:00', 'reserved'], ['21:00', 'reserved']);
    const isPast = () => false;
    const range = { startTime: '19:00', endTime: '22:00' };

    const result = findBookableSubRange(slots, range, isPast);

    expect(result).toBeNull();
  });

  it('returns null when every available slot in the range has elapsed', () => {
    const slots = makeAvailability(['19:00'], ['20:00'], ['21:00']);

    const result = findBookableSubRange(slots, { startTime: '19:00', endTime: '22:00' }, () => true);

    expect(result).toBeNull();
  });

  it('stops at first hole in the middle, returns only the first contiguous run', () => {
    const slots = makeAvailability(['19:00'], ['20:00', 'reserved'], ['21:00']);
    const isPast = () => false;
    const range = { startTime: '19:00', endTime: '22:00' };

    const result = findBookableSubRange(slots, range, isPast);

    expect(result).toEqual({ startIdx: 0, endIdx: 0 }); // only 19-20
  });

  it('stops at a closed gap omitted from the visible slots', () => {
    const slots = makeAvailability(['19:00'], ['21:00']);
    const isPast = () => false;

    const result = findBookableSubRange(slots, { startTime: '19:00', endTime: '22:00' }, isPast);

    expect(result).toEqual({ startIdx: 0, endIdx: 0 });
  });

  it('trims to the first run of at least 1 hour with half-hour slots (MEL-024)', () => {
    // 19:00 free, 19:30 reserved, 20:00–21:00 free: the 30-minute run is skipped.
    const slots = makeHalves(['19:00'], ['19:30', 'reserved'], ['20:00'], ['20:30'], ['21:00']);

    const result = findBookableSubRange(slots, { startTime: '19:00', endTime: '21:30' }, () => false);

    expect(result).toEqual({ startIdx: 2, endIdx: 4 }); // 20:00–21:30
  });

  it('returns null when only 30 minutes remain bookable (MEL-024)', () => {
    const slots = makeHalves(['11:00'], ['11:30']);
    const isPast = (slot: AvailabilitySlot) => slot.startTime === '11:00';

    expect(findBookableSubRange(slots, { startTime: '11:00', endTime: '12:00' }, isPast)).toBeNull();
  });

  it('trims a range that starts mid-slot to the half hours inside it (MEL-024)', () => {
    const slots = makeHalves(['10:00'], ['10:30'], ['11:00'], ['11:30']);

    expect(findBookableSubRange(slots, { startTime: '10:30', endTime: '12:00' }, () => false)).toEqual({
      startIdx: 1,
      endIdx: 3,
    });
  });

  it('respects range boundaries — slots outside [startTime, endTime) are not included', () => {
    // 18-19, 19-20, 20-21, 21-22, 22-23; range is 19:00–22:00
    const slots = makeAvailability(['18:00'], ['19:00'], ['20:00'], ['21:00'], ['22:00']);
    const isPast = () => false;
    const range = { startTime: '19:00', endTime: '22:00' };

    const result = findBookableSubRange(slots, range, isPast);

    expect(result).toEqual({ startIdx: 1, endIdx: 3 }); // indices 1,2,3 (19-20, 20-21, 21-22)
  });
});
