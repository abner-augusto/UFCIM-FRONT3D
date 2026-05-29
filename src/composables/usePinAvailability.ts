import { ref } from 'vue';
import { api } from '@/services/api';
import { logger } from '@/utils/logger';
import { TIME_SLOT_RANGES } from '@/types/reservation';
import type { Space } from '@/types/space';
import type { PeriodKey } from '@/utils/period';

export type { PeriodKey } from '@/utils/period';

export type PinStatus = 'available' | 'partial' | 'reserved' | 'blocked' | 'closed' | 'not_reservable';

export const PERIOD_COLORS: Record<PinStatus, string> = {
  available: '#00b050',
  partial: '#f2c200',
  reserved: '#d32f2f',
  blocked: '#e8650a',      // orange — blocked for this period, reason shown in popup
  closed: '#d32f2f',       // visually same as reserved, but semantically distinct
  not_reservable: '#9e9e9e', // grey — space exists but cannot be reserved
};

export function derivePinStatus(
  slots: Array<{ startTime: string; endTime: string; status: string }>,
  period: PeriodKey,
): PinStatus {
  const range = TIME_SLOT_RANGES[period];
  const periodSlots = slots.filter(
    (slot) => slot.startTime >= range.startTime && slot.startTime < range.endTime,
  );

  // All slots explicitly not reservable → space is not open for bookings
  if (periodSlots.length > 0 && periodSlots.every((slot) => slot.status === 'not_reservable')) {
    return 'not_reservable';
  }

  const openSlots = periodSlots.filter((slot) => slot.status !== 'closed' && slot.status !== 'not_reservable');

  if (openSlots.length === 0) return 'closed';
  if (openSlots.some((slot) => slot.status === 'blocked')) return 'blocked';

  const availableCount = openSlots.filter((slot) => slot.status === 'available').length;
  const reservedCount = openSlots.filter((slot) => slot.status === 'reserved').length;

  if (availableCount === 0) return 'reserved';
  if (reservedCount === 0) return 'available';
  return 'partial';
}

export function usePinAvailability() {
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchStatuses(
    spaces: Map<string, Space>,
    token: string | null,
    date: string,
    period: PeriodKey,
  ): Promise<Map<string, { status: PinStatus; slots: Array<{ startTime: string; endTime: string; status: string }> }>> {
    loading.value = true;
    error.value = null;

    try {
      const entries = [...spaces.entries()];
      const results = await Promise.allSettled(
        entries.map(([, space]) => api.getAvailability(token, space.id, date)),
      );

      const statusMap = new Map<string, { status: PinStatus; slots: Array<{ startTime: string; endTime: string; status: string }> }>();

      results.forEach((result, index) => {
        if (result.status !== 'fulfilled') {
          const [modelId, space] = entries[index];
          logger.warn(`[Availability] Failed to fetch for space "${modelId}" (${space.id}):`, result.reason);
          return;
        }
        const [modelId] = entries[index];
        statusMap.set(modelId, {
          status: derivePinStatus(result.value, period),
          slots: result.value,
        });
      });

      return statusMap;
    } catch {
      error.value = 'Não foi possível verificar disponibilidade.';
      return new Map();
    } finally {
      loading.value = false;
    }
  }

  return { loading, error, fetchStatuses };
}
