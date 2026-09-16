import type { EquipmentReport } from '@/types/equipment-report';

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
