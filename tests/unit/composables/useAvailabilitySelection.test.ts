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

  it('stops at first hole in the middle, returns only the first contiguous run', () => {
    const slots = makeAvailability(['19:00'], ['20:00', 'reserved'], ['21:00']);
    const isPast = () => false;
    const range = { startTime: '19:00', endTime: '22:00' };

    const result = findBookableSubRange(slots, range, isPast);

    expect(result).toEqual({ startIdx: 0, endIdx: 0 }); // only 19-20
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
