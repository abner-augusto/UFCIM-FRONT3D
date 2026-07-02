import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCurrentPeriod } from '@/utils/period';

function mockHour(hour: number) {
  vi.spyOn(Date.prototype, 'getHours').mockReturnValue(hour);
}

afterEach(() => vi.restoreAllMocks());

describe('getCurrentPeriod', () => {
  it.each([0, 6])('returns morning for hour %i before opening', (hour) => {
    mockHour(hour);
    expect(getCurrentPeriod()).toBe('morning');
  });

  it.each([7, 11])('returns morning for hour %i inside the morning window', (hour) => {
    mockHour(hour);
    expect(getCurrentPeriod()).toBe('morning');
  });

  it('returns afternoon at hour 12 because the morning window is closed', () => {
    mockHour(12);
    expect(getCurrentPeriod()).toBe('afternoon');
  });

  it.each([13, 17])('returns afternoon for hour %i inside the afternoon window', (hour) => {
    mockHour(hour);
    expect(getCurrentPeriod()).toBe('afternoon');
  });

  it('returns evening at hour 18 because the afternoon window is closed', () => {
    mockHour(18);
    expect(getCurrentPeriod()).toBe('evening');
  });

  it.each([19, 21])('returns evening for hour %i inside the evening window', (hour) => {
    mockHour(hour);
    expect(getCurrentPeriod()).toBe('evening');
  });

  it.each([22, 23])('returns morning at hour %i because the evening window is closed', (hour) => {
    mockHour(hour);
    expect(getCurrentPeriod()).toBe('morning');
  });
});
