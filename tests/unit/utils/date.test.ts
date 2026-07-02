import { describe, expect, it } from 'vitest';
import { formatDateLong, formatDateShort, formatDateTime } from '@/utils/date';

describe('date formatters', () => {
  it('formats date-only ISO values with a long pt-BR month', () => {
    const formatted = formatDateLong('2026-07-02');

    expect(formatted).toContain('2026');
    expect(formatted).toMatch(/julho|07/);
  });

  it('formats short date-only ISO values numerically', () => {
    expect(formatDateShort('2026-07-02')).toContain('02/07/2026');
  });

  it('formats timestamp values and normalizes a space separator', () => {
    const formatted = formatDateTime('2026-07-02 14:30');

    expect(formatted).toContain('02/07/2026');
    expect(formatted).toContain('14:30');
  });

  it('returns an em dash for empty or invalid timestamps', () => {
    expect(formatDateTime('')).toBe('—');
    expect(formatDateTime('garbage')).toBe('—');
  });

  it('anchors date-only values to local noon to avoid day rollovers', () => {
    const formatted = formatDateLong('2026-07-02');

    expect(formatted).toContain('02');
    expect(formatted).not.toContain('01');
    expect(formatted).not.toContain('03');
  });
});
