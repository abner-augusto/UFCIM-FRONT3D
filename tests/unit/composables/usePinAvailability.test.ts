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
    const result = await fetchStatuses(
      new Map([['model-1', { id: 'space-1' } as Space]]),
      null,
      '2026-09-20',
      'evening',
    );

    expect(result.get('model-1')?.nextAvailableDate).toBe('2026-09-21');
  });
});
