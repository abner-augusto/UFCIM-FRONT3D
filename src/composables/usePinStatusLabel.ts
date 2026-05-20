import type { PinStatus } from '@/composables/usePinAvailability';

export interface PinLabelInfo {
  statusText: string | null;
  statusColor: string | null;
}

const COLORS: Record<string, string> = {
  available: '#3B6D11',
  partial: '#633806',
  reserved: '#501313',
  blocked: '#7A3F03',
  closed: '#501313',
  not_reservable: '#666',
};

function formatHourLabel(time: string): string {
  return time.split(':')[0] + 'h';
}

/**
 * Given the status + availability slots for a pin, produces a short status text
 * for the pin label. Examples:
 *   - "Livre" (available all period)
 *   - "Livre 14h" (became available mid-period at 14h)
 *   - "até 16h" (occupied until 16h)
 *   - "Ocupada" (occupied all period)
 */
export function buildPinStatusLabel(
  status: PinStatus,
  slots: Array<{ startTime: string; endTime: string; status: string }>,
  period: { startTime: string; endTime: string },
): PinLabelInfo {
  if (status === 'not_reservable' || status === 'closed') {
    return { statusText: null, statusColor: null };
  }

  if (status === 'blocked') {
    return { statusText: 'Bloqueada', statusColor: COLORS.blocked };
  }

  if (status === 'available') {
    return { statusText: 'Livre', statusColor: COLORS.available };
  }

  if (status === 'reserved') {
    return { statusText: 'Ocupada', statusColor: COLORS.reserved };
  }

  // partial — find the boundary
  const periodSlots = slots
    .filter(s => s.startTime >= period.startTime && s.startTime < period.endTime)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  let firstAvailable: string | null = null;
  const firstSlot = periodSlots[0];
  const lastSlot = periodSlots[periodSlots.length - 1];

  for (const slot of periodSlots) {
    if (slot.status === 'available') {
      if (firstAvailable === null) firstAvailable = slot.startTime;
    }
  }

  if (firstSlot?.status === 'reserved' && lastSlot?.status === 'available' && firstAvailable) {
    return { statusText: `Livre ${formatHourLabel(firstAvailable)}`, statusColor: COLORS.partial };
  }
  if (firstSlot?.status === 'available' && lastSlot?.status === 'reserved') {
    const transitionSlot = periodSlots.find(s => s.status === 'reserved');
    if (transitionSlot) {
      return { statusText: `até ${formatHourLabel(transitionSlot.startTime)}`, statusColor: COLORS.partial };
    }
  }

  return { statusText: 'Parcial', statusColor: COLORS.partial };
}
