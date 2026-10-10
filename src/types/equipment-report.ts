/** Room service categories for tickets without equipment (MEL-026). Order is display order. */
export const MAINTENANCE_CATEGORIES = [
  'lighting',
  'electrical',
  'painting',
  'ceiling',
  'doors_windows',
  'plumbing',
  'furniture',
  'other',
] as const;

export type MaintenanceCategory = (typeof MAINTENANCE_CATEGORIES)[number];

export const MAINTENANCE_CATEGORY_LABELS: Record<MaintenanceCategory, string> = {
  lighting: 'Iluminação',
  electrical: 'Tomadas e elétrica',
  painting: 'Pintura',
  ceiling: 'Forro e teto',
  doors_windows: 'Portas e janelas',
  plumbing: 'Hidráulica',
  furniture: 'Mobiliário',
  other: 'Outro',
};

export type OpenReportStatus = 'pending' | 'acknowledged';

/** Room of a ticket, as embedded by the tickets list. */
export interface ReportSpace {
  id: string;
  name: string;
  number: string;
  block?: string;
  modelId?: string | null;
  campus?: string;
  department?: { id: string; name: string };
}

/**
 * A maintenance ticket. It targets one equipment (`equipmentId`) or, since
 * MEL-026, the room itself by `category` with no equipment. `space` is the
 * ticket's room in both cases.
 */
export interface EquipmentReport {
  id: string;
  equipmentId: string | null;
  spaceId?: string;
  category?: MaintenanceCategory | null;
  reportedBy: string;
  description: string;
  severity: 'minor' | 'major' | 'blocking';
  status: 'pending' | 'acknowledged' | 'resolved' | 'dismissed';
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  dismissedReason?: string | null;
  createdAt: string;
  reporter?: { id: string; name: string; role: string };
  acknowledger?: { id: string; name: string; role: string } | null;
  space?: ReportSpace | null;
  equipment?: {
    id: string;
    name: string;
    assetId: string | null;
    space?: ReportSpace;
  } | null;
}

export const SEVERITY_LABELS: Record<EquipmentReport['severity'], string> = {
  minor: 'Leve · estética ou opcional',
  major: 'Importante · prejudica a aula',
  blocking: 'Crítico · sala inutilizável',
};

export const REPORT_STATUS_LABELS: Record<EquipmentReport['status'], string> = {
  pending: 'Pendente',
  acknowledged: 'Em análise',
  resolved: 'Resolvido',
  dismissed: 'Descartado',
};
