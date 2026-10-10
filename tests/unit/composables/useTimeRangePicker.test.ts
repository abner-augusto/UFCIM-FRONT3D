import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { useTimeRangePicker } from '@/composables/useTimeRangePicker';
import { minutesToTime, timeToMinutes } from '@/utils/slots';
import type { AvailabilitySlot } from '@/types/reservation';

type Status = AvailabilitySlot['status'];

function day(...busy: Array<[string, string, Status]>): AvailabilitySlot[] {
  const slots: AvailabilitySlot[] = [];
  for (let m = timeToMinutes('07:00'); m < timeToMinutes('22:00'); m += 30) {
    const startTime = minutesToTime(m);
    const hit = busy.find(([from, to]) => startTime >= from && startTime < to);
    slots.push({ startTime, endTime: minutesToTime(m + 30), status: hit ? hit[2] : 'available' });
  }
  return slots;
}

function setup(slots: AvailabilitySlot[], isPast: (slot: AvailabilitySlot) => boolean = () => false) {
  const source = ref(slots);
  return {
    source,
    ...useTimeRangePicker({
      slots: source,
      isBookable: (slot) => slot.status === 'available' && !isPast(slot),
    }),
  };
}

describe('useTimeRangePicker (MEL-024)', () => {
  it('starts empty, with no end options', () => {
    const { start, end, endOptions, range } = setup(day());

    expect(start.value).toBe('');
    expect(end.value).toBe('');
    expect(endOptions.value).toEqual([]);
    expect(range.value).toBeNull();
  });

  it('pre-fills the end with start + 1 hour', () => {
    const { start, end, range } = setup(day());

    start.value = '16:30';

    expect(end.value).toBe('17:30');
    expect(range.value).toEqual({ startTime: '16:30', endTime: '17:30' });
  });

  it('lets the user extend the end within the valid options', () => {
    const { start, end, endOptions, range } = setup(day(['18:00', '19:00', 'reserved']));

    start.value = '16:30';
    end.value = '18:00';

    expect(endOptions.value).toEqual(['17:30', '18:00']);
    expect(range.value).toEqual({ startTime: '16:30', endTime: '18:00' });
  });

  it('ignores an end that is not offered', () => {
    const { start, end } = setup(day(['18:00', '19:00', 'reserved']));

    start.value = '16:30';
    end.value = '17:00';
    expect(end.value).toBe('17:30');

    end.value = '19:00';
    expect(end.value).toBe('17:30');
  });

  it('ignores a start that is not offered', () => {
    const { start, end } = setup(day(['17:00', '18:00', 'reserved']));

    start.value = '16:30';

    expect(start.value).toBe('');
    expect(end.value).toBe('');
  });

  it('applies an initial range trimmed to the first bookable hour or more', () => {
    const { applyRange, range } = setup(day(['13:00', '13:30', 'reserved']));

    expect(applyRange({ startTime: '13:00', endTime: '18:00' })).toBe(true);
    expect(range.value).toEqual({ startTime: '13:30', endTime: '18:00' });
  });

  it('skips past slots when applying an initial range', () => {
    // now = 10:40: 10:00–10:30 is over, the in-progress 10:30 slot stays bookable.
    const { applyRange, range } = setup(day(), (slot) => slot.endTime <= '10:40');

    applyRange({ startTime: '10:00', endTime: '12:00' });

    expect(range.value).toEqual({ startTime: '10:30', endTime: '12:00' });
  });

  it('leaves the picker empty when the initial range has no free hour', () => {
    const { applyRange, range } = setup(day(['11:00', '11:30', 'reserved']));

    expect(applyRange({ startTime: '11:00', endTime: '12:00' })).toBe(false);
    expect(range.value).toBeNull();
  });

  it('clears a selection that new availability made invalid', () => {
    const { source, start, end, range } = setup(day());

    start.value = '16:30';
    end.value = '18:00';
    source.value = day(['17:00', '17:30', 'reserved']);

    expect(start.value).toBe('');
    expect(end.value).toBe('');
    expect(range.value).toBeNull();
  });

  it('shortens the end when only part of the range is still free', () => {
    const { source, start, end } = setup(day());

    start.value = '16:00';
    end.value = '18:00';
    source.value = day(['17:30', '18:00', 'reserved']);

    // Valid ends are now 17:00 and 17:30; keep the latest one before 18:00.
    expect(start.value).toBe('16:00');
    expect(end.value).toBe('17:30');
  });

  it('clear() resets both fields', () => {
    const { start, end, clear } = setup(day());

    start.value = '09:00';
    clear();

    expect(start.value).toBe('');
    expect(end.value).toBe('');
  });
});
