import { describe, expect, it } from 'vitest';
import {
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_CATEGORY_LABELS,
  type EquipmentReport,
} from '@/types/equipment-report';
import {
  categoryLabel,
  isRoomTicket,
  isTicketDescriptionValid,
  openRoomReportList,
  reportSpace,
  reportTitle,
} from '@/utils/maintenance-tickets';

const SPACE = { id: 's-1', name: 'Sala B2-03', number: 'B2-03', block: '2' };

function report(overrides: Partial<EquipmentReport> = {}): EquipmentReport {
  return {
    id: '7f3a2b1c-0000-0000-0000-000000000000',
    equipmentId: 'equip-1',
    reportedBy: 'user-1',
    description: 'não liga',
    severity: 'major',
    status: 'pending',
    acknowledgedBy: null,
    acknowledgedAt: null,
    resolvedAt: null,
    createdAt: '2026-10-10T10:00:00.000Z',
    equipment: { id: 'equip-1', name: 'Projetor Epson', assetId: 'P-001', space: SPACE },
    ...overrides,
  };
}

const roomTicket = (overrides: Partial<EquipmentReport> = {}) =>
  report({ equipmentId: null, equipment: null, category: 'lighting', space: SPACE, ...overrides });

describe('maintenance categories (MEL-026)', () => {
  it('has a pt-BR label for every category, in display order, without cleaning', () => {
    expect(MAINTENANCE_CATEGORIES.map((c) => MAINTENANCE_CATEGORY_LABELS[c])).toEqual([
      'Iluminação',
      'Tomadas e elétrica',
      'Pintura',
      'Forro e teto',
      'Portas e janelas',
      'Hidráulica',
      'Mobiliário',
      'Outro',
    ]);
  });

  it('labels unknown or missing categories as "Outro"', () => {
    expect(categoryLabel('doors_windows')).toBe('Portas e janelas');
    expect(categoryLabel(null)).toBe('Outro');
    expect(categoryLabel('cleaning' as never)).toBe('Outro');
  });
});

describe('ticket card display mapping (MEL-026)', () => {
  it('titles an equipment ticket with the equipment name', () => {
    expect(isRoomTicket(report())).toBe(false);
    expect(reportTitle(report())).toBe('Projetor Epson');
  });

  it('titles a room ticket with its category label', () => {
    expect(isRoomTicket(roomTicket())).toBe(true);
    expect(reportTitle(roomTicket())).toBe('Iluminação');
    expect(reportTitle(roomTicket({ category: 'plumbing' }))).toBe('Hidráulica');
  });

  it('falls back to "Equipamento" for an equipment ticket missing its embed', () => {
    expect(reportTitle(report({ equipment: undefined }))).toBe('Equipamento');
  });

  it('resolves the room from the ticket, then from its equipment', () => {
    expect(reportSpace(roomTicket())).toEqual(SPACE);
    expect(reportSpace(report())).toEqual(SPACE);
    expect(reportSpace(report({ space: { ...SPACE, id: 's-2' } }))?.id).toBe('s-2');
    expect(reportSpace(report({ equipment: undefined }))).toBeNull();
  });
});

describe('isTicketDescriptionValid (MEL-026)', () => {
  it('requires 5 characters for equipment tickets', () => {
    expect(isTicketDescriptionValid({ kind: 'equipment' }, 'abc')).toBe(false);
    expect(isTicketDescriptionValid({ kind: 'equipment' }, 'Não liga')).toBe(true);
  });

  it('makes the description optional for room categories except "Outro"', () => {
    expect(isTicketDescriptionValid({ kind: 'room', category: 'lighting' }, '')).toBe(true);
    expect(isTicketDescriptionValid({ kind: 'room', category: 'other' }, '   ')).toBe(false);
    expect(isTicketDescriptionValid({ kind: 'room', category: 'other' }, 'Cortina rasgada')).toBe(true);
  });
});

describe('openRoomReportList (MEL-026)', () => {
  it('lists open room tickets in category order with their status label', () => {
    expect(openRoomReportList({ plumbing: 'pending', lighting: 'acknowledged' })).toEqual([
      { category: 'lighting', label: 'Iluminação', status: 'acknowledged', statusLabel: 'Em análise' },
      { category: 'plumbing', label: 'Hidráulica', status: 'pending', statusLabel: 'Reportado' },
    ]);
  });

  it('is empty when nothing is open', () => {
    expect(openRoomReportList(undefined)).toEqual([]);
    expect(openRoomReportList({})).toEqual([]);
  });
});
