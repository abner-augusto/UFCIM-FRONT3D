import { describe, expect, it } from 'vitest';
import {
  mapMaintenanceHistory,
  mapEquipmentMaintenanceReport,
  type RawMaintenanceHistory,
  type RawEquipmentMaintenanceReport,
} from '@/services/api';

const SPACE = { id: 's-1', name: 'Sala 03', number: 'B2-03', block: 'Bloco 2', department: 'IAUD' };

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'eq-1',
    name: 'Projetor',
    assetId: '0000000001',
    type: 'projector',
    status: 'broken',
    space: SPACE,
    reportCount: 4,
    openCount: 1,
    resolvedCount: 2,
    dismissedCount: 1,
    breakdownCount: 2,
    repairCount: 1,
    lastReportAt: '2026-09-14T03:00:00.000Z',
    lastSeverity: 'blocking',
    recurrences: 2,
    isRecurrent: true,
    timeInBrokenDays: 4.5,
    ...overrides,
  };
}

describe('mapMaintenanceHistory', () => {
  it('sums the summary cards from the equipment rows', () => {
    const raw: RawMaintenanceHistory = {
      range: { from: '2026-09-01', to: '2026-09-16', days: 16 },
      historySince: '2026-09-01T03:00:00.000Z',
      series: [],
      equipment: [
        row(),
        row({ id: 'eq-2', status: 'working', reportCount: 1, openCount: 0, isRecurrent: false, timeInBrokenDays: 1.25 }),
        row({ id: 'eq-3', status: 'under_repair', reportCount: 0, openCount: 0, isRecurrent: false, timeInBrokenDays: 0 }),
      ],
    };

    const result = mapMaintenanceHistory(raw);

    expect(result.summary).toEqual({
      equipmentCount: 3,
      reportCount: 5,
      openCount: 1,
      brokenNowCount: 1,
      timeInBrokenDays: 5.8, // 4.5 + 1.25, one decimal
      recurrentCount: 1,
    });
    expect(result.historySince).toBe('2026-09-01T03:00:00.000Z');
    expect(result.range).toEqual({ from: '2026-09-01', to: '2026-09-16', days: 16 });
  });

  it('fills missing fields with safe defaults', () => {
    const result = mapMaintenanceHistory({ equipment: [{ id: 'eq-9', name: 'Cadeira' }] });

    expect(result.historySince).toBeNull();
    expect(result.series).toEqual([]);
    expect(result.equipment[0]).toMatchObject({
      id: 'eq-9',
      name: 'Cadeira',
      assetId: '',
      status: 'working',
      space: null,
      reportCount: 0,
      openCount: 0,
      lastReportAt: null,
      lastSeverity: null,
      recurrences: 0,
      isRecurrent: false,
      timeInBrokenDays: 0,
    });
    expect(result.summary.equipmentCount).toBe(1);
  });

  it('handles an empty payload', () => {
    const result = mapMaintenanceHistory({});
    expect(result.equipment).toEqual([]);
    expect(result.summary).toEqual({
      equipmentCount: 0,
      reportCount: 0,
      openCount: 0,
      brokenNowCount: 0,
      timeInBrokenDays: 0,
      recurrentCount: 0,
    });
    expect(result.range).toEqual({ from: '', to: '', days: 0 });
  });

  it('keeps daily points for short windows', () => {
    const result = mapMaintenanceHistory({
      series: [
        { date: '2026-09-01', reports: 2, brokenDays: 0.5 },
        { date: '2026-09-02', reports: 0, brokenDays: 1 },
      ],
    });

    expect(result.series).toEqual([
      { start: '2026-09-01', label: '01/09', reports: 2, brokenDays: 0.5 },
      { start: '2026-09-02', label: '02/09', reports: 0, brokenDays: 1 },
    ]);
  });

  it('groups long windows into weeks starting at the first day', () => {
    const series = Array.from({ length: 45 }, (_, i) => {
      const d = new Date(Date.UTC(2026, 6, 1 + i));
      return { date: d.toISOString().slice(0, 10), reports: 1, brokenDays: 0.5 };
    });

    const result = mapMaintenanceHistory({ series });

    expect(result.series).toHaveLength(7); // 6 full weeks + 3 days
    expect(result.series[0]).toEqual({ start: '2026-07-01', label: '01/07', reports: 7, brokenDays: 3.5 });
    expect(result.series[6]).toEqual({ start: '2026-08-12', label: '12/08', reports: 3, brokenDays: 1.5 });
  });
});

describe('mapEquipmentMaintenanceReport', () => {
  const raw: RawEquipmentMaintenanceReport = {
    equipment: { id: 'eq-1', name: 'Projetor', assetId: '0000000001', type: 'projector', status: 'broken', notes: null, space: SPACE },
    range: { from: '2026-09-01', to: '2026-09-16', days: 16 },
    historySince: '2026-09-01T03:00:00.000Z',
    summary: {
      reportCount: 4, openCount: 1, resolvedCount: 2, dismissedCount: 1,
      breakdownCount: 2, repairCount: 1, timeInBrokenDays: 4.5,
      averageTimeToAcknowledgeHours: 4, averageTimeToResolveHours: 72,
      lastOccurrenceAt: '2026-09-14T03:00:00.000Z', recurrences: 2, isRecurrent: true,
    },
    series: [{ date: '2026-09-01', reports: 1, brokenDays: 0 }],
    timeline: [
      { id: 'report:r-1', type: 'report', at: '2026-09-05T03:00:00.000Z', label: 'Reportado (Importante)', severity: 'major', status: 'pending', author: 'Maria' },
      { id: 'status:h-1', type: 'status', at: '2026-09-05T03:00:00.000Z', label: 'Funcionando → Com defeito', status: 'broken', fromStatus: 'working', source: 'report' },
      { id: 'status:h-2', type: 'status', at: '2026-09-07T03:00:00.000Z', label: 'Com defeito → Em manutenção', status: 'under_repair', fromStatus: 'broken', source: 'manual' },
    ],
  };

  it('keeps the summary and orders the timeline newest first', () => {
    const result = mapEquipmentMaintenanceReport(raw);

    expect(result.summary.averageTimeToResolveHours).toBe(72);
    expect(result.summary.isRecurrent).toBe(true);
    expect(result.timeline.map((e) => e.id)).toEqual(['status:h-2', 'status:h-1', 'report:r-1']);
    expect(result.series).toEqual([{ start: '2026-09-01', label: '01/09', reports: 1, brokenDays: 0 }]);
    expect(result.equipment.space?.number).toBe('B2-03');
  });

  it('defaults absent averages and timeline', () => {
    const result = mapEquipmentMaintenanceReport({
      equipment: { id: 'eq-1', name: 'Projetor' },
      summary: {},
    });

    expect(result.summary.averageTimeToAcknowledgeHours).toBeNull();
    expect(result.summary.averageTimeToResolveHours).toBeNull();
    expect(result.summary.lastOccurrenceAt).toBeNull();
    expect(result.summary.reportCount).toBe(0);
    expect(result.timeline).toEqual([]);
    expect(result.equipment.status).toBe('working');
  });
});
