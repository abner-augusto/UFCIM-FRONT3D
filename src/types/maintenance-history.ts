// MEL-013: equipment maintenance history report.

export type EquipmentStatus = 'working' | 'broken' | 'under_repair' | 'replacement_scheduled';
export type ReportSeverity = 'minor' | 'major' | 'blocking';
export type HistorySource = 'report' | 'manual' | 'system';

export interface MaintenanceRange {
  from: string;
  to: string;
  days: number;
}

export interface MaintenanceSpace {
  id: string;
  name: string;
  number: string;
  block: string;
  department: string;
}

/** Ticket and status counts shared by the list rows and the detail summary. */
export interface MaintenanceCounts {
  reportCount: number;
  openCount: number;
  resolvedCount: number;
  dismissedCount: number;
  breakdownCount: number;
  repairCount: number;
  timeInBrokenDays: number;
  recurrences: number;
  isRecurrent: boolean;
}

export interface MaintenanceEquipmentRow extends MaintenanceCounts {
  id: string;
  name: string;
  assetId: string;
  type: string;
  status: EquipmentStatus;
  space: MaintenanceSpace | null;
  lastReportAt: string | null;
  lastSeverity: ReportSeverity | null;
}

/** One bar of the chart: a day, or a week when the window is long. */
export interface MaintenanceSeriesPoint {
  /** First day covered by the point (YYYY-MM-DD). */
  start: string;
  label: string;
  reports: number;
  brokenDays: number;
}

export interface MaintenanceTimelineEvent {
  id: string;
  type: 'report' | 'status';
  at: string;
  label: string;
  severity?: ReportSeverity;
  status?: string;
  fromStatus?: string;
  source?: HistorySource;
  author?: string;
  description?: string;
}

export interface MaintenanceHistorySummary {
  equipmentCount: number;
  reportCount: number;
  openCount: number;
  brokenNowCount: number;
  timeInBrokenDays: number;
  recurrentCount: number;
}

export interface MaintenanceHistory {
  range: MaintenanceRange;
  historySince: string | null;
  summary: MaintenanceHistorySummary;
  series: MaintenanceSeriesPoint[];
  equipment: MaintenanceEquipmentRow[];
}

export interface EquipmentMaintenanceSummary extends MaintenanceCounts {
  averageTimeToAcknowledgeHours: number | null;
  averageTimeToResolveHours: number | null;
  lastOccurrenceAt: string | null;
}

export interface EquipmentMaintenanceReport {
  equipment: {
    id: string;
    name: string;
    assetId: string;
    type: string;
    status: EquipmentStatus;
    notes: string | null;
    space: MaintenanceSpace | null;
  };
  range: MaintenanceRange;
  historySince: string | null;
  summary: EquipmentMaintenanceSummary;
  series: MaintenanceSeriesPoint[];
  /** Newest first. */
  timeline: MaintenanceTimelineEvent[];
}

export interface MaintenanceHistoryFilters {
  from: string;
  to: string;
  spaceId: string;
  departmentId: string;
  status: '' | EquipmentStatus;
  severity: '' | ReportSeverity;
}

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  working: 'Funcionando',
  broken: 'Com defeito',
  under_repair: 'Em manutenção',
  replacement_scheduled: 'Substituição agendada',
};

export const SEVERITY_SHORT_LABELS: Record<ReportSeverity, string> = {
  minor: 'Leve',
  major: 'Importante',
  blocking: 'Crítico',
};

export const HISTORY_SOURCE_LABELS: Record<HistorySource, string> = {
  report: 'Automático, pelo reporte',
  manual: 'Alteração manual',
  system: 'Início do histórico',
};
