import { describe, expect, it } from 'vitest';
import { ref, nextTick } from 'vue';
import { useHourRangeSelection, hourLabel, isHourAvailable } from '@/composables/useHourRangeSelection';
import type { AvailabilitySlot } from '@/types/reservation';

function makeSlot(startTime: string, status: AvailabilitySlot['status'] = 'available'): AvailabilitySlot {
  const h = parseInt(startTime.split(':')[0], 10);
  const endTime = h === 23 ? '24:00' : `${String(h + 1).padStart(2, '0')}:00`;
  return { startTime, endTime, status };
}

type SlotSpec = [string, AvailabilitySlot['status']?];
function makeAvailability(...specs: SlotSpec[]): AvailabilitySlot[] {
  return specs.map(([t, s]) => makeSlot(t, s));
}

const FAR_FUTURE = '2099-12-31';
const PAST_DATE = '2000-01-01';

function setup(slots: AvailabilitySlot[], date = FAR_FUTURE) {
  const availability = ref<AvailabilitySlot[] | null>(slots);
  const selectedDate = ref(date);
  return { ...useHourRangeSelection(availability, selectedDate), availability, selectedDate };
}

describe('hourLabel', () => {
  it('replaces :00 suffix with h', () => {
    expect(hourLabel('07:00')).toBe('07h');
    expect(hourLabel('13:00')).toBe('13h');
    expect(hourLabel('22:00')).toBe('22h');
  });
});

describe('isHourAvailable', () => {
  it('returns true only for available status', () => {
    expect(isHourAvailable(makeSlot('07:00', 'available'))).toBe(true);
    expect(isHourAvailable(makeSlot('07:00', 'reserved'))).toBe(false);
    expect(isHourAvailable(makeSlot('07:00', 'blocked'))).toBe(false);
    expect(isHourAvailable(makeSlot('07:00', 'closed'))).toBe(false);
  });
});

describe('isPastTime', () => {
  it('returns false for a far future date', () => {
    const { isPastTime } = setup([], FAR_FUTURE);
    expect(isPastTime('07:00')).toBe(false);
    expect(isPastTime('23:00')).toBe(false);
  });

  it('returns true for a past date', () => {
    const { isPastTime } = setup([], PAST_DATE);
    expect(isPastTime('07:00')).toBe(true);
    expect(isPastTime('23:00')).toBe(true);
  });
});

describe('handleHourClick — selection state machine', () => {
  it('sets start on first click', () => {
    const { pickedStart, pickedEnd, handleHourClick } = setup(
      makeAvailability(['07:00'], ['08:00'], ['09:00']),
    );
    handleHourClick(makeSlot('07:00'));
    expect(pickedStart.value).toBe('07:00');
    expect(pickedEnd.value).toBeNull();
  });

  it('clears start when the same slot is clicked again with no end', () => {
    const { pickedStart, handleHourClick } = setup(makeAvailability(['07:00']));
    handleHourClick(makeSlot('07:00'));
    handleHourClick(makeSlot('07:00'));
    expect(pickedStart.value).toBeNull();
  });

  it('sets ordered end on second click', () => {
    const { pickedStart, pickedEnd, handleHourClick } = setup(
      makeAvailability(['07:00'], ['08:00'], ['09:00']),
    );
    handleHourClick(makeSlot('07:00'));
    handleHourClick(makeSlot('09:00'));
    expect(pickedStart.value).toBe('07:00');
    expect(pickedEnd.value).toBe('09:00');
  });

  it('reorders start/end regardless of click order', () => {
    const { pickedStart, pickedEnd, handleHourClick } = setup(
      makeAvailability(['07:00'], ['08:00'], ['09:00']),
    );
    handleHourClick(makeSlot('09:00'));
    handleHourClick(makeSlot('07:00'));
    expect(pickedStart.value).toBe('07:00');
    expect(pickedEnd.value).toBe('09:00');
  });

  it('restarts from clicked slot when both endpoints are already set', () => {
    const { pickedStart, pickedEnd, handleHourClick } = setup(
      makeAvailability(['07:00'], ['08:00'], ['09:00'], ['10:00']),
    );
    handleHourClick(makeSlot('07:00'));
    handleHourClick(makeSlot('09:00'));
    handleHourClick(makeSlot('10:00'));
    expect(pickedStart.value).toBe('10:00');
    expect(pickedEnd.value).toBeNull();
  });

  it('restarts when the range would span an unavailable slot', () => {
    const { pickedStart, pickedEnd, handleHourClick } = setup(
      makeAvailability(['07:00'], ['08:00', 'reserved'], ['09:00']),
    );
    handleHourClick(makeSlot('07:00'));
    handleHourClick(makeSlot('09:00'));
    expect(pickedStart.value).toBe('09:00');
    expect(pickedEnd.value).toBeNull();
  });

  it('ignores clicks on unavailable slots', () => {
    const { pickedStart, handleHourClick } = setup(makeAvailability(['07:00', 'reserved']));
    handleHourClick(makeSlot('07:00', 'reserved'));
    expect(pickedStart.value).toBeNull();
  });
});

describe('getHourState', () => {
  it('returns available when nothing is picked', () => {
    const { getHourState } = setup(makeAvailability(['07:00']));
    expect(getHourState(makeSlot('07:00'))).toBe('available');
  });

  it('returns endpoint for the picked start before end is set', () => {
    const { getHourState, handleHourClick } = setup(makeAvailability(['07:00'], ['08:00']));
    handleHourClick(makeSlot('07:00'));
    expect(getHourState(makeSlot('07:00'))).toBe('endpoint');
  });

  it('returns endpoint for both range boundaries', () => {
    const { getHourState, handleHourClick } = setup(
      makeAvailability(['07:00'], ['08:00'], ['09:00']),
    );
    handleHourClick(makeSlot('07:00'));
    handleHourClick(makeSlot('09:00'));
    expect(getHourState(makeSlot('07:00'))).toBe('endpoint');
    expect(getHourState(makeSlot('09:00'))).toBe('endpoint');
  });

  it('returns selected for slots inside the range', () => {
    const { getHourState, handleHourClick } = setup(
      makeAvailability(['07:00'], ['08:00'], ['09:00']),
    );
    handleHourClick(makeSlot('07:00'));
    handleHourClick(makeSlot('09:00'));
    expect(getHourState(makeSlot('08:00'))).toBe('selected');
  });

  it('returns unavailable for non-selectable slots', () => {
    const { getHourState } = setup(makeAvailability(['07:00', 'reserved']));
    expect(getHourState(makeSlot('07:00', 'reserved'))).toBe('unavailable');
  });
});

describe('customRangeLabel', () => {
  it('is null when nothing is picked', () => {
    const { customRangeLabel } = setup(makeAvailability(['07:00'], ['08:00']));
    expect(customRangeLabel.value).toBeNull();
  });

  it('shows partial hint when only start is picked', () => {
    const { customRangeLabel, handleHourClick } = setup(makeAvailability(['07:00'], ['08:00']));
    handleHourClick(makeSlot('07:00'));
    expect(customRangeLabel.value).toContain('07h');
    expect(customRangeLabel.value).toContain('selecione');
  });

  it('shows full range label when both endpoints are set', () => {
    const { customRangeLabel, handleHourClick } = setup(
      makeAvailability(['07:00'], ['08:00'], ['09:00']),
    );
    handleHourClick(makeSlot('07:00'));
    handleHourClick(makeSlot('09:00'));
    // pickedEnd = '09:00', customRangeEnd = endTime of '09:00' slot = '10:00'
    expect(customRangeLabel.value).toContain('07h');
    expect(customRangeLabel.value).toContain('10h');
  });
});

describe('resetPicks', () => {
  it('clears both picked endpoints', () => {
    const { pickedStart, pickedEnd, handleHourClick, resetPicks } = setup(
      makeAvailability(['07:00'], ['08:00']),
    );
    handleHourClick(makeSlot('07:00'));
    handleHourClick(makeSlot('08:00'));
    resetPicks();
    expect(pickedStart.value).toBeNull();
    expect(pickedEnd.value).toBeNull();
  });
});

describe('selectedDate watcher', () => {
  it('resets picks when selectedDate changes', async () => {
    const { pickedStart, pickedEnd, handleHourClick, selectedDate } = setup(
      makeAvailability(['07:00'], ['08:00']),
    );
    handleHourClick(makeSlot('07:00'));
    handleHourClick(makeSlot('08:00'));
    selectedDate.value = '2099-12-30';
    await nextTick();
    expect(pickedStart.value).toBeNull();
    expect(pickedEnd.value).toBeNull();
  });
});
