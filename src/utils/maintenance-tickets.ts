import {
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_CATEGORY_LABELS,
  type EquipmentReport,
  type MaintenanceCategory,
  type OpenReportStatus,
  type ReportSpace,
} from '@/types/equipment-report';

/** What a new ticket is about: one equipment, or the room by category (MEL-026). */
export type TicketTarget =
  | { kind: 'equipment' }
  | { kind: 'room'; category: MaintenanceCategory };

const MIN_DESCRIPTION = 5;

export const OPEN_REPORT_STATUS_LABELS: Record<OpenReportStatus, string> = {
  pending: 'Reportado',
  acknowledged: 'Em análise',
};

export function categoryLabel(category: MaintenanceCategory | null | undefined): string {
  return (category && MAINTENANCE_CATEGORY_LABELS[category]) || MAINTENANCE_CATEGORY_LABELS.other;
}

export function isRoomTicket(report: EquipmentReport): boolean {
  return !report.equipmentId;
}

/** Card title: the equipment name, or the category for a room ticket. */
export function reportTitle(report: EquipmentReport): string {
  if (isRoomTicket(report)) return categoryLabel(report.category);
  return report.equipment?.name ?? 'Equipamento';
}

/** The ticket's room: its own `space`, else the equipment's. */
export function reportSpace(report: EquipmentReport): ReportSpace | null {
  return report.space ?? report.equipment?.space ?? null;
}

/**
 * Mirrors the backend rule: equipment tickets need 5 characters; room tickets
 * may skip the description, except "Outro", where it is the only detail.
 */
export function isTicketDescriptionValid(target: TicketTarget, description: string): boolean {
  const length = description.trim().length;
  if (target.kind === 'room' && target.category !== 'other') return true;
  return length >= MIN_DESCRIPTION;
}

export interface OpenRoomReport {
  category: MaintenanceCategory;
  label: string;
  status: OpenReportStatus;
  statusLabel: string;
}

/** Open room tickets in category order, for the popup and the dialog. */
export function openRoomReportList(
  status: Partial<Record<MaintenanceCategory, OpenReportStatus>> | null | undefined,
): OpenRoomReport[] {
  if (!status) return [];
  return MAINTENANCE_CATEGORIES.flatMap((category) => {
    const s = status[category];
    return s
      ? [{ category, label: MAINTENANCE_CATEGORY_LABELS[category], status: s, statusLabel: OPEN_REPORT_STATUS_LABELS[s] }]
      : [];
  });
}
