import { describe, expect, it } from 'vitest';
import { useEquipmentGroups } from '@/composables/useEquipmentGroups';
import type { Equipment, Space } from '@/types/space';

function equipment(overrides: Partial<Equipment> = {}): Equipment {
  return {
    id: 'eq-1',
    spaceId: 'space-1',
    assetId: 'P-001',
    name: 'Projetor Epson',
    type: 'projector',
    status: 'working',
    notes: null,
    updatedBy: null,
    updatedAt: '2026-09-16T10:00:00.000Z',
    ...overrides,
  };
}

function spaceWith(items: Equipment[]): Space {
  return {
    id: 'space-1',
    name: 'Sala 01',
    number: 'B2-03',
    modelId: null,
    type: 'classroom',
    block: 'Bloco 2',
    campus: 'benfica',
    department: 'iaud',
    capacity: 30,
    furniture: null,
    lighting: null,
    hvac: null,
    multimedia: null,
    closedFrom: null,
    closedTo: null,
    description: null,
    reservable: true,
    equipment: items,
  };
}

describe('useEquipmentGroups — open maintenance reports (MEL-015)', () => {
  it('counts pending and acknowledged open reports per group', () => {
    const { equipmentGroups } = useEquipmentGroups(() =>
      spaceWith([
        equipment({ id: 'e1', openReportStatus: 'pending' }),
        equipment({ id: 'e2', openReportStatus: 'acknowledged' }),
        equipment({ id: 'e3', openReportStatus: null }),
      ]),
    );

    expect(equipmentGroups.value).toHaveLength(1);
    expect(equipmentGroups.value[0]).toMatchObject({
      total: 3,
      openPending: 1,
      openAcknowledged: 1,
    });
  });

  it('prefers acknowledged over pending for the group state and label', () => {
    const { equipmentGroups, groupReportState, reportStatusLabel } = useEquipmentGroups(() =>
      spaceWith([
        equipment({ id: 'e1', openReportStatus: 'pending' }),
        equipment({ id: 'e2', openReportStatus: 'acknowledged' }),
      ]),
    );

    const group = equipmentGroups.value[0];
    expect(groupReportState(group)).toBe('acknowledged');
    expect(reportStatusLabel(group)).toBe('Em análise');
  });

  it('labels a pending-only group as Reportado', () => {
    const { equipmentGroups, groupReportState, reportStatusLabel } = useEquipmentGroups(() =>
      spaceWith([equipment({ openReportStatus: 'pending' })]),
    );

    const group = equipmentGroups.value[0];
    expect(groupReportState(group)).toBe('pending');
    expect(reportStatusLabel(group)).toBe('Reportado');
  });

  it('returns none/null when no equipment has an open report', () => {
    const { equipmentGroups, groupReportState, reportStatusLabel } = useEquipmentGroups(() =>
      spaceWith([equipment({ openReportStatus: null })]),
    );

    const group = equipmentGroups.value[0];
    expect(groupReportState(group)).toBe('none');
    expect(reportStatusLabel(group)).toBeNull();
  });

  it('still derives the physical severity from the equipment status', () => {
    const { equipmentGroups, groupSeverity, groupStatusLabel, groupReportState } =
      useEquipmentGroups(() =>
        spaceWith([
          equipment({ id: 'e1', status: 'broken' }),
          equipment({ id: 'e2', status: 'working', openReportStatus: 'acknowledged' }),
        ]),
      );

    const group = equipmentGroups.value[0];
    expect(groupSeverity(group)).toBe('broken');
    expect(groupStatusLabel(group)).toBe('1 com defeito');
    expect(groupReportState(group)).toBe('acknowledged');
  });
});
