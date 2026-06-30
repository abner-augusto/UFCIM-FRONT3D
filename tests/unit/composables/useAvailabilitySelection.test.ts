import { describe, expect, it } from 'vitest';
import { computed, ref } from 'vue';
import { useAvailabilitySelection } from '@/composables/useAvailabilitySelection';
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
