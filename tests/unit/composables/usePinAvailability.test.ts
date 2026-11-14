import { describe, expect, it, vi } from 'vitest';
import { api } from '@/services/api';
import { derivePinStatus, usePinAvailability } from '@/composables/usePinAvailability';
import type { PeriodKey } from '@/utils/period';
import type { Space } from '@/types/space';

vi.mock('@/services/api', () => ({
  api: { getAvailability: vi.fn() },
}));

function makeSlots(overrides: Record<string, string> = {}) {
  return Array.from({ length: 24 }, (_, i) => {
    const startTime = `${String(i).padStart(2, '0')}:00`;
    const endTime = i === 23 ? '24:00' : `${String(i + 1).padStart(2, '0')}:00`;
    const status = overrides[startTime] ?? (i >= 22 || i < 7 ? 'closed' : 'available');
    return { startTime, endTime, status };
  });
}

function rangeOverrides(hours: string[], status: string) {
  return Object.fromEntries(hours.map((hour) => [hour, status]));
}

function expectStatus(period: PeriodKey, overrides: Record<string, string>, expected: string) {
  expect(derivePinStatus(makeSlots(overrides), period)).toBe(expected);
}

describe('derivePinStatus', () => {
  it('returns available when all slots in the period are available', () => {
    expectStatus('morning', {}, 'available');
  });

  it('returns reserved when all slots in the period are reserved', () => {
    expectStatus('morning', rangeOverrides(['07:00', '08:00', '09:00', '10:00', '11:00'], 'reserved'), 'reserved');
  });

  it('returns partial when there are both available and reserved slots', () => {
    expectStatus('morning', { '07:00': 'reserved' }, 'partial');
  });

  it('returns blocked when any slot is blocked', () => {
    expectStatus('morning', { '09:00': 'blocked' }, 'blocked');
  });

  it('returns blocked when blocked would otherwise be partial', () => {
    expectStatus('morning', { '07:00': 'reserved', '09:00': 'blocked' }, 'blocked');
  });

  it('ignores closed slots when other open slots are available', () => {
    expectStatus('morning', { '07:00': 'closed' }, 'available');
  });

  it('returns closed when all slots in the period are closed', () => {
    expectStatus('morning', rangeOverrides(['07:00', '08:00', '09:00', '10:00', '11:00'], 'closed'), 'closed');
  });

  it('evaluates the evening range correctly', () => {
    expectStatus('evening', rangeOverrides(['19:00', '20:00', '21:00'], 'reserved'), 'reserved');
  });

  it('finds the next available date when the whole day is reserved', async () => {
    const todaySlots = makeSlots(rangeOverrides([
      '07:00', '08:00', '09:00', '10:00', '11:00',
      '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
      '19:00', '20:00', '21:00',
    ], 'reserved'));
    const tomorrowSlots = makeSlots();
    vi.mocked(api.getAvailability).mockImplementation(async (_token, _spaceId, date) =>
      date === '2026-09-20' ? todaySlots : tomorrowSlots,
    );

    const { fetchStatuses } = usePinAvailability();
    const onNextDate = vi.fn();
    await fetchStatuses(
      new Map([['model-1', { id: 'space-1' } as Space]]),
      null,
      '2026-09-20',
      'evening', onNextDate,
    );

    await vi.waitFor(() => expect(onNextDate).toHaveBeenCalledWith('model-1', '2026-09-21'));
  });
});

it('reuses daily slots when the period changes', async () => {
  vi.mocked(api.getAvailability).mockReset().mockResolvedValue(makeSlots());
  const { fetchStatuses } = usePinAvailability();
  const spaces = new Map([['model', { id: 'space' } as Space]]);
  await fetchStatuses(spaces, null, '2026-09-20', 'morning');
  await fetchStatuses(spaces, null, '2026-09-20', 'evening');
  expect(api.getAvailability).toHaveBeenCalledTimes(1);
});

it('limits concurrent next-date searches to four', async () => {
  const reserved = makeSlots(Object.fromEntries(Array.from({ length: 15 }, (_, i) => [`${String(i + 7).padStart(2, '0')}:00`, 'reserved'])));
  let active = 0;
  let peak = 0;
  vi.mocked(api.getAvailability).mockReset().mockImplementation(async (_token, _id, date) => {
    if (date === '2026-09-20') return reserved;
    active++;
    peak = Math.max(peak, active);
    await new Promise(resolve => setTimeout(resolve, 1));
    active--;
    return makeSlots();
  });
  const spaces = new Map(Array.from({ length: 9 }, (_, i) => [`model${i}`, { id: `space${i}` } as Space]));
  const onNextDate = vi.fn();
  await usePinAvailability().fetchStatuses(spaces, null, '2026-09-20', 'morning', onNextDate);
  await vi.waitFor(() => expect(onNextDate).toHaveBeenCalledTimes(9));
  expect(peak).toBe(4);
});


it('shares the next-date limit across simultaneous lookups', async () => {
  const reserved = makeSlots(Object.fromEntries(Array.from({ length: 15 }, (_, i) => [`${String(i + 7).padStart(2, '0')}:00`, 'reserved'])));
  let active = 0;
  let peak = 0;
  vi.mocked(api.getAvailability).mockReset().mockImplementation(async (_token, _id, date) => {
    if (date === '2026-09-20') return reserved;
    active++;
    peak = Math.max(peak, active);
    await new Promise(resolve => setTimeout(resolve, 5));
    active--;
    return makeSlots();
  });
  const spaces = (prefix: string) => new Map(Array.from({ length: 6 }, (_, i) => [`${prefix}${i}`, { id: `${prefix}${i}` } as Space]));
  const onNextDate = vi.fn();
  await Promise.all([
    usePinAvailability().fetchStatuses(spaces('a'), null, '2026-09-20', 'morning', onNextDate),
    usePinAvailability().fetchStatuses(spaces('b'), null, '2026-09-20', 'morning', onNextDate),
  ]);
  await vi.waitFor(() => expect(onNextDate).toHaveBeenCalledTimes(12));
  expect(peak).toBe(4);
});

it('refetches after invalidation, expiry and rejection', async () => {
  const get = vi.mocked(api.getAvailability).mockReset().mockResolvedValue(makeSlots());
  const availability = usePinAvailability();
  const spaces = new Map([['m', { id: 's' } as Space]]);
  const fetch = () => availability.fetchStatuses(spaces, null, '2026-09-20', 'morning');
  const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
  await fetch(); await fetch();
  expect(get).toHaveBeenCalledTimes(1);
  now.mockReturnValue(61001);
  await fetch();
  expect(get).toHaveBeenCalledTimes(2);
  availability.invalidate();
  get.mockRejectedValueOnce(new Error('failed'));
  await fetch(); await fetch();
  expect(get).toHaveBeenCalledTimes(4);
  now.mockRestore();
});

it('cancels queued and subsequent next-date requests', async () => {
  const reserved = makeSlots(Object.fromEntries(Array.from({ length: 15 }, (_, i) => [`${String(i + 7).padStart(2, '0')}:00`, 'reserved'])));
  const releases: Array<() => void> = [];
  const get = vi.mocked(api.getAvailability).mockReset().mockImplementation(async (_token, _id, date) => {
    if (date === '2026-09-20') return reserved;
    await new Promise<void>(resolve => releases.push(resolve));
    return reserved;
  });
  const availability = usePinAvailability();
  const spaces = new Map(Array.from({ length: 8 }, (_, i) => [`m${i}`, { id: `s${i}` } as Space]));
  const callback = vi.fn();
  await availability.fetchStatuses(spaces, null, '2026-09-20', 'morning', callback);
  await vi.waitFor(() => expect(releases).toHaveLength(4));
  availability.cancel();
  releases.forEach(resolve => resolve());
  await new Promise(resolve => setTimeout(resolve, 10));
  expect(get).toHaveBeenCalledTimes(12);
  expect(callback).not.toHaveBeenCalled();
});

it('releases a next-date slot after a rejected request', async () => {
  const reserved = makeSlots(Object.fromEntries(Array.from({ length: 15 }, (_, i) => [`${String(i + 7).padStart(2, '0')}:00`, 'reserved'])));
  const get = vi.mocked(api.getAvailability).mockReset().mockImplementation(async (_token, id, date) => {
    if (date === '2026-09-20') return reserved;
    if (id === 's0') throw new Error('failed');
    return makeSlots();
  });
  const spaces = new Map(Array.from({ length: 6 }, (_, i) => [`m${i}`, { id: `s${i}` } as Space]));
  const callback = vi.fn();
  await usePinAvailability().fetchStatuses(spaces, null, '2026-09-20', 'morning', callback);
  await vi.waitFor(() => expect(callback).toHaveBeenCalledTimes(5));
  expect(get).toHaveBeenCalledTimes(12);
});
