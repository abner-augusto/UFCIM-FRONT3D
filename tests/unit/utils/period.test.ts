import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCurrentPeriod } from '@/utils/period';

function mockHour(hour: number) {
  vi.spyOn(Date.prototype, 'getHours').mockReturnValue(hour);
}

afterEach(() => vi.restoreAllMocks());

describe('getCurrentPeriod', () => {
  it('returns morning for hour 7', () => {
    mockHour(7);
    expect(getCurrentPeriod()).toBe('morning');
  });

  it('returns morning for hour 12', () => {
    mockHour(12);
    expect(getCurrentPeriod()).toBe('morning');
  });

  it('returns afternoon for hour 13', () => {
    mockHour(13);
    expect(getCurrentPeriod()).toBe('afternoon');
  });

  it('returns afternoon for hour 18', () => {
    mockHour(18);
    expect(getCurrentPeriod()).toBe('afternoon');
  });

  it('returns evening for hour 19', () => {
    mockHour(19);
    expect(getCurrentPeriod()).toBe('evening');
  });

  it('returns evening for hour 22', () => {
    mockHour(22);
    expect(getCurrentPeriod()).toBe('evening');
  });

  it('returns morning for hour 0 (midnight)', () => {
    mockHour(0);
    expect(getCurrentPeriod()).toBe('morning');
  });

  it('returns morning for hour 6 (before opening)', () => {
    mockHour(6);
    expect(getCurrentPeriod()).toBe('morning');
  });

  it('returns morning for hour 23 (after closing)', () => {
    mockHour(23);
    expect(getCurrentPeriod()).toBe('morning');
  });
});
