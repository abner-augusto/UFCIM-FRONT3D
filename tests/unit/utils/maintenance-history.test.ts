import { describe, expect, it } from 'vitest';
import {
  formatDays,
  formatHours,
  rangeDays,
  sortMaintenanceRows,
} from '@/utils/maintenance-history';
import type { MaintenanceEquipmentRow } from '@/types/maintenance-history';

function row(id: string, overrides: Partial<MaintenanceEquipmentRow> = {}): MaintenanceEquipmentRow {
  return {
    id,
    name: id,
    assetId: '',
    type: '',
    status: 'working',
    space: null,
    reportCount: 0,
    openCount: 0,
    resolvedCount: 0,
    dismissedCount: 0,
    breakdownCount: 0,
    repairCount: 0,
    timeInBrokenDays: 0,
    recurrences: 0,
    isRecurrent: false,
    lastReportAt: null,
    lastSeverity: null,
    ...overrides,
  };
}

describe('sortMaintenanceRows', () => {
  const rows = [
    row('minor-open', { openCount: 1, lastSeverity: 'minor', reportCount: 5, lastReportAt: '2026-09-10T00:00:00Z' }),
    row('broken-long', { status: 'broken', timeInBrokenDays: 12, reportCount: 1, lastReportAt: '2026-09-01T00:00:00Z' }),
    row('blocking-open', { status: 'broken', openCount: 1, lastSeverity: 'blocking', timeInBrokenDays: 2, reportCount: 2, lastReportAt: '2026-09-15T00:00:00Z' }),
    row('recurrent', { status: 'working', isRecurrent: true, reportCount: 3 }),
  ];

  it('ranks by criticality: open ticket severity, then current status, then recurrence, then broken time', () => {
    expect(sortMaintenanceRows(rows, 'criticality').map((r) => r.id)).toEqual([
      'blocking-open',
      'minor-open',
      'broken-long',
      'recurrent',
    ]);
  });

  it('ranks by time broken', () => {
    expect(sortMaintenanceRows(rows, 'brokenTime').map((r) => r.id)).toEqual([
      'broken-long',
      'blocking-open',
      'minor-open',
      'recurrent',
    ]);
  });

  it('ranks by report count and by last report, without mutating the input', () => {
    const before = rows.map((r) => r.id);
    expect(sortMaintenanceRows(rows, 'reports').map((r) => r.id)).toEqual([
      'minor-open',
      'recurrent',
      'blocking-open',
      'broken-long',
    ]);
    expect(sortMaintenanceRows(rows, 'lastReport').map((r) => r.id)).toEqual([
      'blocking-open',
      'minor-open',
      'broken-long',
      'recurrent',
    ]);
    expect(rows.map((r) => r.id)).toEqual(before);
  });
});

describe('formatDays / formatHours', () => {
  it('formats days in pt-BR with singular and plural', () => {
    expect(formatDays(0)).toBe('0 dias');
    expect(formatDays(1)).toBe('1 dia');
    expect(formatDays(12.4)).toBe('12,4 dias');
  });

  it('formats short durations in hours and long ones in days', () => {
    expect(formatHours(null)).toBe('—');
    expect(formatHours(6.2)).toBe('6,2 h');
    expect(formatHours(72)).toBe('3 dias');
  });
});

describe('rangeDays', () => {
  it('counts both ends of the window', () => {
    expect(rangeDays('2026-09-01', '2026-09-01')).toBe(1);
    expect(rangeDays('2026-06-19', '2026-09-16')).toBe(90);
  });

  it('returns 0 for an inverted or incomplete window', () => {
    expect(rangeDays('2026-09-10', '2026-09-01')).toBe(0);
    expect(rangeDays('', '2026-09-01')).toBe(0);
  });
});
