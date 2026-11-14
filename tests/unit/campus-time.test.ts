import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import { followCampusToday } from '@/composables/useCampusToday';
import { campusMinutesNow, isSlotPast } from '@/utils/slots';
import { addLocalDays, campusInstant, campusISODate, defaultReportPeriod } from '@/utils/date';
import { useAvailabilitySelection } from '@/composables/useAvailabilitySelection';

afterEach(() => vi.useRealTimers());

describe('campus time', () => {
  it('uses the campus calendar for report defaults at 22h', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-15T01:00:00Z'));
    const today = campusISODate();
    expect(new Date().getTimezoneOffset()).not.toBe(180);
    expect(today).toBe('2026-11-14');
    expect(defaultReportPeriod()).toEqual({ startDate: '2026-10-16', endDate: '2026-11-14' });
    expect(addLocalDays(today, -29)).toBe('2026-10-16');
    expect(campusInstant(today, '24:00').toISOString()).toBe('2026-11-15T03:00:00.000Z');
  });

  it('moves the selected date at midnight only when it followed today', async () => {
    const today = ref('2026-11-14');
    const selected = ref(today.value);
    followCampusToday(today, selected);
    today.value = '2026-11-15';
    await nextTick();
    expect(selected.value).toBe('2026-11-15');
    selected.value = '2026-11-20';
    today.value = '2026-11-16';
    await nextTick();
    expect(selected.value).toBe('2026-11-20');
  });

  it('keeps an in-progress slot bookable until midnight', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-15T02:30:00Z'));
    const slot = { startTime: '23:00', endTime: '24:00', status: 'available' as const };
    const selection = useAvailabilitySelection({ availability: ref([slot]), selectedDate: ref('2026-11-14') });
    expect(selection.isPastSlot(slot)).toBe(false);
    expect(isSlotPast('2026-11-14', '24:00', Date.now())).toBe(false);
    expect(campusMinutesNow('2026-11-14', Date.now())).toBe(1410);
    expect(campusMinutesNow('2026-11-15', Date.now())).toBeNull();
    selection.nowTs.value = new Date('2026-11-15T03:00:00Z').getTime();
    expect(selection.isPastSlot(slot)).toBe(true);
  });
});
