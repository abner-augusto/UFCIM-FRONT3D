import type { EquipmentReport } from '@/types/equipment-report';
import type { Blocking } from '@/types/reservation';

/** Max length accepted by the blocking `reason` field (mirrors the backend validator). */
export const BLOCKING_REASON_MAX_LENGTH = 500;

/**
 * Builds the pre-filled blocking reason when the flow starts from a maintenance
 * ticket, e.g. `Chamado 7f3a2b1c — Projetor Epson: não liga desde ontem`.
 * The short id keeps the ticket traceable from the blocking list.
 */
export function buildBlockingReasonFromReport(report: EquipmentReport): string {
  const equipment = report.equipment?.name ?? 'Equipamento';
  const base = `Chamado ${report.id.slice(0, 8)} — ${equipment}: ${report.description}`;
  if (base.length <= BLOCKING_REASON_MAX_LENGTH) return base;
  return `${base.slice(0, BLOCKING_REASON_MAX_LENGTH - 1).trimEnd()}…`;
}

/** One card in "Meus bloqueios": a multi-day operation or a legacy single row. */
export interface BlockingGroup {
  /** `batchId` when the rows share one, else a synthetic single-row id. */
  id: string;
  blockings: Blocking[];
  dateFrom: string;
  dateTo: string;
  days: number;
  startTime: string;
  endTime: string;
  blockType: Blocking['blockType'];
  reason: string | null;
  createdAt: string;
  /** True when the group holds more than one day. */
  multiDay: boolean;
}

/**
 * Groups blockings by `batchId` (MEL-017). Rows without a batch (created before
 * the feature) become single-day groups so the list is always one card per
 * operation. Groups are ordered by start date descending; days inside a group
 * are ordered ascending.
 */
export function groupBlockings(blockings: Blocking[]): BlockingGroup[] {
  const map = new Map<string, Blocking[]>();
  for (const blocking of blockings) {
    const key = blocking.batchId ?? `single:${blocking.id}`;
    const list = map.get(key);
    if (list) list.push(blocking);
    else map.set(key, [blocking]);
  }

  const groups: BlockingGroup[] = [...map.entries()].map(([id, rows]) => {
    const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    return {
      id,
      blockings: sorted,
      dateFrom: first.date,
      dateTo: last.date,
      days: sorted.length,
      startTime: first.startTime,
      endTime: first.endTime,
      blockType: first.blockType,
      reason: first.reason,
      createdAt: first.createdAt,
      multiDay: sorted.length > 1,
    };
  });

  return groups.sort(
    (a, b) => b.dateFrom.localeCompare(a.dateFrom) || b.createdAt.localeCompare(a.createdAt),
  );
}
