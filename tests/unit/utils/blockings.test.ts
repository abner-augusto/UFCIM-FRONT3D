import { describe, expect, it } from 'vitest';
import {
  BLOCKING_REASON_MAX_LENGTH,
  buildBlockingReasonFromReport,
} from '@/utils/blockings';
import type { EquipmentReport } from '@/types/equipment-report';

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
