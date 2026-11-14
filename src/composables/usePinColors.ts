import { onUnmounted, watch, type Ref } from 'vue';
import { usePinAvailability, PERIOD_COLORS, type PinAvailabilityData, type PeriodKey } from '@/composables/usePinAvailability';
import { updatePinLabels } from '@/utils/updatePinLabels';
import { logger } from '@/utils/logger';
import type { Space } from '@/types/space';

type Range = Parameters<typeof updatePinLabels>[1];
type Viewer = {
  applyBackendFilter: (ids: Set<string>, colors: Map<string, string>) => void;
  updatePinLabelStatus: (id: string, text: string | null, color: string | null) => void;
} | null;

type Options = {
  spacesByModelId: Map<string, Space>;
  spacesLoaded: Ref<boolean>;
  token: () => string | null;
  selectedDate: Ref<string>;
  selectedPeriod: Ref<PeriodKey>;
  periodRange: Ref<Range>;
  viewer: () => Viewer;
  trayOpen: [Ref<boolean>, Ref<boolean>];
};

export function usePinColors(options: Options) {
  const availability = usePinAvailability();
  let statuses = new Map<string, PinAvailabilityData>();
  let sequence = 0;

  function refreshLabels(seq: number) {
    return updatePinLabels(statuses, options.periodRange.value, options.selectedDate.value,
      (id, text, color) => options.viewer()?.updatePinLabelStatus(id, text, color),
      () => seq === sequence);
  }

  async function applyPinColors() {
    const seq = ++sequence;
    if (!options.spacesLoaded.value) return;
    try {
      const pendingDates = new Map<string, string>();
      let applied = false;
      const next = await availability.fetchStatuses(options.spacesByModelId, options.token(),
        options.selectedDate.value, options.selectedPeriod.value, (id, date) => {
          pendingDates.set(id, date);
          if (applied && seq === sequence) {
            const data = statuses.get(id);
            if (data) data.nextAvailableDate = date;
            void refreshLabels(seq);
          }
        });
      if (seq !== sequence) return;
      pendingDates.forEach((date, id) => {
        const data = next.get(id);
        if (data) data.nextAvailableDate = date;
      });
      statuses = next;
      applied = true;
      const colors = new Map<string, string>();
      statuses.forEach(({ status }, id) => colors.set(id, PERIOD_COLORS[status]));
      options.viewer()?.applyBackendFilter(new Set(statuses.keys()), colors);
      await refreshLabels(seq);
    } catch (error) {
      logger.error('Falha ao atualizar cores:', error);
    }
  }

  watch(options.trayOpen, ([reservation, blocking], [oldReservation, oldBlocking]) => {
    if ((oldReservation && !reservation) || (oldBlocking && !blocking)) availability.invalidate();
  });
  onUnmounted(() => {
    sequence++;
    availability.cancel();
  });
  return {
    loading: availability.loading,
    applyPinColors,
    invalidate: availability.invalidate,
    getStatus: (id: string) => statuses.get(id),
  };
}
