import type {
  EquipmentStatus,
  MaintenanceEquipmentRow,
  MaintenanceSeriesPoint,
  ReportSeverity,
} from '@/types/maintenance-history';

/** Same cap as the backend (MEL-013). */
export const MAX_MAINTENANCE_RANGE_DAYS = 90;

/** Windows longer than this are charted per week instead of per day. */
const MAX_DAILY_POINTS = 31;

const DAY_MS = 24 * 60 * 60 * 1000;

export type MaintenanceSortKey = 'criticality' | 'brokenTime' | 'reports' | 'lastReport';

const SEVERITY_RANK: Record<ReportSeverity, number> = { minor: 1, major: 2, blocking: 3 };
const STATUS_RANK: Record<EquipmentStatus, number> = {
  working: 0,
  replacement_scheduled: 1,
  under_repair: 1,
  broken: 2,
};

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Inclusive day count of a YYYY-MM-DD window; 0 when inverted or incomplete. */
export function rangeDays(from: string, to: string): number {
  if (!from || !to) return 0;
  const diff = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  if (isNaN(diff) || diff < 0) return 0;
  return Math.round(diff / DAY_MS) + 1;
}

/** "2026-09-01" → "01/09", without going through the local timezone. */
function dayMonth(iso: string): string {
  const [, month, day] = iso.split('-');
  return `${day}/${month}`;
}

/**
 * Daily points for short windows; weeks counted from the first day otherwise,
 * so a 90-day window becomes 13 readable bars.
 */
export function groupSeries(
  daily: Array<{ date: string; reports: number; brokenDays: number }>,
): MaintenanceSeriesPoint[] {
  const size = daily.length > MAX_DAILY_POINTS ? 7 : 1;
  const points: MaintenanceSeriesPoint[] = [];
  for (let i = 0; i < daily.length; i += size) {
    const chunk = daily.slice(i, i + size);
    points.push({
      start: chunk[0].date,
      label: dayMonth(chunk[0].date),
      reports: chunk.reduce((sum, d) => sum + d.reports, 0),
      brokenDays: round(chunk.reduce((sum, d) => sum + d.brokenDays, 0), 2),
    });
  }
  return points;
}

function openSeverityRank(row: MaintenanceEquipmentRow): number {
  return row.openCount > 0 && row.lastSeverity ? SEVERITY_RANK[row.lastSeverity] : 0;
}

const COMPARATORS: Record<MaintenanceSortKey, (a: MaintenanceEquipmentRow, b: MaintenanceEquipmentRow) => number> = {
  // Open ticket severity first, then current status, then recurrence, then time broken.
  criticality: (a, b) =>
    openSeverityRank(b) - openSeverityRank(a) ||
    (STATUS_RANK[b.status] ?? 0) - (STATUS_RANK[a.status] ?? 0) ||
    Number(b.isRecurrent) - Number(a.isRecurrent) ||
    b.timeInBrokenDays - a.timeInBrokenDays,
  brokenTime: (a, b) => b.timeInBrokenDays - a.timeInBrokenDays,
  reports: (a, b) => b.reportCount - a.reportCount,
  lastReport: (a, b) => (b.lastReportAt ?? '').localeCompare(a.lastReportAt ?? ''),
};

/** Sorted copy; ties keep the incoming order. */
export function sortMaintenanceRows(
  rows: MaintenanceEquipmentRow[],
  key: MaintenanceSortKey,
): MaintenanceEquipmentRow[] {
  return [...rows].sort(COMPARATORS[key]);
}

function formatNumber(value: number): string {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

/** 0 → "0 dias", 1 → "1 dia", 12.4 → "12,4 dias". */
export function formatDays(days: number): string {
  return `${formatNumber(days)} ${days === 1 ? 'dia' : 'dias'}`;
}

/** Average durations: hours below two days, days from there on. */
export function formatHours(hours: number | null): string {
  if (hours === null) return '—';
  if (hours < 48) return `${formatNumber(hours)} h`;
  return formatDays(round(hours / 24, 1));
}
