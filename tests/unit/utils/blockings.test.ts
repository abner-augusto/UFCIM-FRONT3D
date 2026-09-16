import { describe, expect, it } from 'vitest';
import {
  BLOCKING_REASON_MAX_LENGTH,
  buildBlockingReasonFromReport,
  groupBlockings,
} from '@/utils/blockings';
import type { EquipmentReport } from '@/types/equipment-report';
import type { Blocking } from '@/types/reservation';

function report(overrides: Partial<EquipmentReport> = {}): EquipmentReport {
  return {
    id: '7f3a2b1c-0000-0000-0000-000000000000',
    equipmentId: 'equip-1',
    reportedBy: 'user-1',
    description: 'não liga desde ontem',
    severity: 'major',
    status: 'pending',
    acknowledgedBy: null,
    acknowledgedAt: null,
    resolvedAt: null,
    createdAt: '2026-09-16T10:00:00.000Z',
    equipment: { id: 'equip-1', name: 'Projetor Epson', assetId: 'P-001' },
    ...overrides,
  };
}

describe('buildBlockingReasonFromReport', () => {
  it('includes the ticket short id, equipment and description', () => {
    expect(buildBlockingReasonFromReport(report())).toBe(
      'Chamado 7f3a2b1c — Projetor Epson: não liga desde ontem',
    );
  });

  it('falls back to "Equipamento" when the equipment is missing', () => {
    expect(buildBlockingReasonFromReport(report({ equipment: undefined }))).toBe(
      'Chamado 7f3a2b1c — Equipamento: não liga desde ontem',
    );
  });

  it('truncates to the backend reason limit', () => {
    const reason = buildBlockingReasonFromReport(report({ description: 'x'.repeat(600) }));

    expect(reason.length).toBe(BLOCKING_REASON_MAX_LENGTH);
    expect(reason.endsWith('…')).toBe(true);
  });
});

function blocking(overrides: Partial<Blocking> = {}): Blocking {
  return {
    id: 'b1',
    spaceId: 'space-1',
    date: '2099-06-15',
    startTime: '08:00',
    endTime: '09:00',
    blockType: 'maintenance',
    reason: 'Reparo elétrico',
    status: 'active',
    createdAt: '2099-06-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('groupBlockings', () => {
  it('groups rows that share a batchId (MEL-017)', () => {
    const groups = groupBlockings([
      blocking({ id: 'd1', date: '2099-06-15', batchId: 'batch-1' }),
      blocking({ id: 'd2', date: '2099-06-16', batchId: 'batch-1' }),
      blocking({ id: 'd3', date: '2099-06-17', batchId: 'batch-1' }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      id: 'batch-1',
      dateFrom: '2099-06-15',
      dateTo: '2099-06-17',
      days: 3,
      multiDay: true,
    });
    expect(groups[0].blockings.map((row) => row.id)).toEqual(['d1', 'd2', 'd3']);
  });

  it('keeps legacy rows without a batchId as single-day groups', () => {
    const groups = groupBlockings([
      blocking({ id: 'legacy-1', date: '2099-06-20' }),
      blocking({ id: 'legacy-2', date: '2099-06-10' }),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({ id: 'single:legacy-1', days: 1, multiDay: false });
    expect(groups[1]).toMatchObject({ id: 'single:legacy-2', days: 1, multiDay: false });
  });

  it('orders groups by start date descending', () => {
    const groups = groupBlockings([
      blocking({ id: 'a', date: '2099-06-10' }),
      blocking({ id: 'b', date: '2099-06-25' }),
      blocking({ id: 'c', date: '2099-06-18' }),
    ]);

    expect(groups.map((g) => g.dateFrom)).toEqual(['2099-06-25', '2099-06-18', '2099-06-10']);
  });

  it('sorts days inside a group ascending regardless of input order', () => {
    const groups = groupBlockings([
      blocking({ id: 'd3', date: '2099-06-17', batchId: 'batch-1' }),
      blocking({ id: 'd1', date: '2099-06-15', batchId: 'batch-1' }),
      blocking({ id: 'd2', date: '2099-06-16', batchId: 'batch-1' }),
    ]);

    expect(groups[0].blockings.map((row) => row.date)).toEqual([
      '2099-06-15',
      '2099-06-16',
      '2099-06-17',
    ]);
    expect(groups[0]).toMatchObject({ dateFrom: '2099-06-15', dateTo: '2099-06-17' });
  });
});
