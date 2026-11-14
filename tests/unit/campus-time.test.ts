import { afterEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { addLocalDays, campusInstant, toLocalISODate } from '@/utils/date';
import { useAvailabilitySelection } from '@/composables/useAvailabilitySelection';

afterEach(() => vi.useRealTimers());

describe('campus time', () => {
  it('uses the campus calendar for report defaults at 22h', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-15T01:00:00Z'));
    const today = toLocalISODate();
    expect(today).toBe('2026-11-14');
    expect(addLocalDays(today, -29)).toBe('2026-10-16');
    expect(campusInstant(today, '24:00').toISOString()).toBe('2026-11-15T03:00:00.000Z');
  });

  it('keeps an in-progress slot bookable until midnight', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-15T02:30:00Z'));
    const slot = { startTime: '23:00', endTime: '24:00', status: 'available' as const };
    const selection = useAvailabilitySelection({ availability: ref([slot]), selectedDate: ref('2026-11-14') });
    expect(selection.isPastSlot(slot)).toBe(false);
    selection.nowTs.value = new Date('2026-11-15T03:00:00Z').getTime();
    expect(selection.isPastSlot(slot)).toBe(true);
  });
});
