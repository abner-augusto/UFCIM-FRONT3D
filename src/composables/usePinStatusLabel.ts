import type { PinStatus } from '@/composables/usePinAvailability';
import { addLocalDays } from '@/utils/date';

export interface PinLabelInfo {
  statusText: string | null;
  statusColor: string | null;
}

const COLOR_TOKENS: Record<string, { token: string; fallback: string }> = {
  available: { token: '--success', fallback: '#3B6D11' },
  partial: { token: '--warning', fallback: '#633806' },
  reserved: { token: '--danger-fg', fallback: '#501313' },
  blocked: { token: '--warning', fallback: '#7A3F03' },
  closed: { token: '--danger-fg', fallback: '#501313' },
  not_reservable: { token: '--muted-foreground', fallback: '#666' },
};

function resolvedColor(status: keyof typeof COLOR_TOKENS): string {
  const { token, fallback } = COLOR_TOKENS[status];
  if (typeof window === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim() || fallback;
}

function formatHourLabel(time: string): string {
  return `${time.slice(0, 2)}h`;
}

function formatDateLabel(date: string, selectedDate?: string): string {
  if (selectedDate && date === addLocalDays(selectedDate, 1)) return 'amanhã';
  return `${date.slice(8, 10)}/${date.slice(5, 7)}`;
}

/**
 * Given the status + availability slots for a pin, produces a short status text
 * for the pin label. Examples:
 *   - "Livre" (available all period)
 *   - "Livre 14h" (became available mid-period at 14h)
 *   - "até 16h" (next free slot starts at 16h)
 *   - "Ocupada" (occupied all period)
 */
export function buildPinStatusLabel(
  status: PinStatus,
  slots: Array<{ startTime: string; endTime: string; status: string }>,
  period: { startTime: string; endTime: string },
  options: { selectedDate?: string; nextAvailableDate?: string } = {},
): PinLabelInfo {
  if (status === 'not_reservable' || status === 'closed') {
    return { statusText: null, statusColor: null };
  }

  if (status === 'blocked') {
    return { statusText: 'Bloqueada', statusColor: resolvedColor('blocked') };
  }

  if (status === 'available') {
    return { statusText: 'Livre', statusColor: resolvedColor('available') };
  }

  if (status === 'reserved') {
    const nextAvailableSlot = slots
      .filter(s => s.startTime >= period.endTime && s.status === 'available')
      .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
    if (nextAvailableSlot) {
      return { statusText: `até ${formatHourLabel(nextAvailableSlot.startTime)}`, statusColor: resolvedColor('reserved') };
    }
    if (options.nextAvailableDate) {
      return {
        statusText: `até ${formatDateLabel(options.nextAvailableDate, options.selectedDate)}`,
        statusColor: resolvedColor('reserved'),
      };
    }
    return { statusText: 'Ocupada', statusColor: resolvedColor('reserved') };
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
    return { statusText: `Livre ${formatHourLabel(firstAvailable)}`, statusColor: resolvedColor('partial') };
  }
  if (firstSlot?.status === 'available') {
    const firstReservedAfterAvailable = periodSlots.findIndex((slot, index) =>
      slot.status === 'reserved' && periodSlots.slice(0, index).some(s => s.status === 'available'),
    );
    if (firstReservedAfterAvailable >= 0) {
      const reservedBlock = [];
      for (let index = firstReservedAfterAvailable; index < periodSlots.length; index++) {
        const slot = periodSlots[index];
        if (slot.status !== 'reserved') break;
        reservedBlock.push(slot);
      }
      if (reservedBlock.every(s => s.status === 'reserved')) {
        const nextAvailableTime = reservedBlock[reservedBlock.length - 1].endTime;
        return { statusText: `até ${formatHourLabel(nextAvailableTime)}`, statusColor: resolvedColor('partial') };
      }
    }
  }

  return { statusText: 'Parcial', statusColor: resolvedColor('partial') };
}
