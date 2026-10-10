import { describe, it, expect } from 'vitest';
import { countRecurringDates } from '@/utils/recurrence';

describe('countRecurringDates', () => {
  it('counts every selected weekday in the range, both ends included', () => {
    // 2099-06-01 is a Monday; Mon/Wed/Fri over two weeks.
    expect(countRecurringDates('2099-06-01', '2099-06-12', [1, 3, 5])).toBe(6);
  });

  it('counts a single weekday', () => {
    expect(countRecurringDates('2099-06-01', '2099-06-29', [1])).toBe(5);
  });

  it('is zero without days or with an incomplete range', () => {
    expect(countRecurringDates('2099-06-01', '2099-06-29', [])).toBe(0);
    expect(countRecurringDates('', '2099-06-29', [1])).toBe(0);
  });
});
