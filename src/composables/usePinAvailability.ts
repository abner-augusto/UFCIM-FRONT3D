import { ref } from 'vue';
import { api } from '@/services/api';
import { TIME_SLOT_RANGES } from '@/types/reservation';
import type { Space } from '@/types/space';
import type { PeriodKey } from '@/utils/period';

export type { PeriodKey } from '@/utils/period';

export type PinStatus = 'available' | 'partial' | 'reserved' | 'blocked' | 'closed';

export const PERIOD_COLORS: Record<PinStatus, string> = {
  available: '#00b050',
  partial: '#f2c200',
  reserved: '#d32f2f',
  blocked: '#000000',
  closed: '#d32f2f', // visually same as reserved, but semantically distinct
};

export function derivePinStatus(
  slots: Array<{ startTime: string; endTime: string; status: string }>,
  period: PeriodKey,
): PinStatus {
  const range = TIME_SLOT_RANGES[period];
  const periodSlots = slots.filter(
    (slot) => slot.startTime >= range.startTime && slot.startTime < range.endTime,
  );
  const openSlots = periodSlots.filter((slot) => slot.status !== 'closed');

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
  ): Promise<Map<string, PinStatus>> {
    loading.value = true;
    error.value = null;

    try {
      const entries = [...spaces.entries()];
      const results = await Promise.allSettled(
        entries.map(([, space]) => api.getAvailability(token, space.id, date)),
      );

      const statusMap = new Map<string, PinStatus>();

      results.forEach((result, index) => {
        if (result.status !== 'fulfilled') return;
        const [modelId] = entries[index];
        statusMap.set(modelId, derivePinStatus(result.value, period));
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
