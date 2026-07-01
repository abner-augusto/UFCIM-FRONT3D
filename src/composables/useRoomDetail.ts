import { ref, computed, onMounted, watch, toValue, type Ref, type MaybeRefOrGetter } from 'vue';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { SPACE_TYPE_LABELS, type Space, type Equipment } from '@/types/space';
import { PURPOSE_LABELS, BLOCK_TYPE_LABELS, type Availability } from '@/types/reservation';
import { useAvailabilitySelection } from '@/composables/useAvailabilitySelection';
import { useEquipmentGroups, type EquipmentGroup } from '@/composables/useEquipmentGroups';

/**
 * Shared room-detail wiring for the two surfaces that show a room's detail:
 * the 3D viewer's `RoomPopup` and the accessible list's `SpaceCard`. It bundles
 * the hourly availability selection, equipment grouping, and the equipment-report
 * dialog state so both stay identical (single source of truth).
 *
 * Availability sourcing has two modes:
 * - **Internal fetch** (default): the composable calls `getAvailability` on mount
 *   and whenever the date/space changes — used by `RoomPopup`.
 * - **External** (pass `availability`): reuse an already-fetched ref (e.g. the
 *   `SpaceBrowser` batch cache) with zero extra network — used by `SpaceCard`.
 */
export interface UseRoomDetailOptions {
  space: MaybeRefOrGetter<Space>;
  selectedDate: Ref<string>;
  defaultStartTime: MaybeRefOrGetter<string>;
  defaultEndTime: MaybeRefOrGetter<string>;
  availability?: Ref<Availability | null>;
}

export function useRoomDetail(options: UseRoomDetailOptions) {
  const auth = useAuthStore();
  const space = computed(() => toValue(options.space));

  // Availability: reuse a provided ref, or own an internally-fetched one.
  const internalAvailability = ref<Availability | null>(null);
  const availability = options.availability ?? internalAvailability;
  const loadingAvailability = ref(false);
  const ownsFetch = !options.availability;

  const defaultStartTime = computed(() => toValue(options.defaultStartTime));
  const defaultEndTime = computed(() => toValue(options.defaultEndTime));

  const selection = useAvailabilitySelection({
    availability,
    selectedDate: options.selectedDate,
    defaultStartTime,
    defaultEndTime,
  });

  async function reload() {
    if (!ownsFetch) return;
    selection.resetSelection();
    loadingAvailability.value = true;
    try {
      internalAvailability.value = await api.getAvailability(auth.token, space.value.id, options.selectedDate.value);
    } finally {
      loadingAvailability.value = false;
    }
  }

  if (ownsFetch) {
    onMounted(reload);
    watch(() => [options.selectedDate.value, space.value.id], reload);
  }

  // Equipment grouping + status helpers
  const { equipmentGroups, groupSeverity, groupStatusLabel } = useEquipmentGroups(() => space.value);
  const groupStatusClass = (g: EquipmentGroup) => `eq-status--${groupSeverity(g)}`;

  // Equipment reporting
  const reportingEquipment = ref<Equipment | null>(null);
  const canReport = computed(() => !!auth.token);
  function openReportFor(group: EquipmentGroup) {
    const item = space.value.equipment?.find((e) => e.name === group.name);
    if (item) reportingEquipment.value = item;
  }
  function onReportSent() {
    reportingEquipment.value = null;
  }

  // Labels shared by both surfaces
  const typeLabel = computed(() => SPACE_TYPE_LABELS[space.value.type] ?? space.value.type);
  const purposeLabel = (p: string) => PURPOSE_LABELS[p] ?? p;
  const blockTypeLabel = (bt: string) => BLOCK_TYPE_LABELS[bt as keyof typeof BLOCK_TYPE_LABELS] ?? bt;
  const formattedDate = computed(() => {
    const d = new Date(options.selectedDate.value + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', weekday: 'short' });
  });

  return {
    // availability + selection
    availability,
    loadingAvailability,
    ...selection,
    reload,
    // equipment
    equipmentGroups,
    groupStatusClass,
    groupStatusLabel,
    // report
    reportingEquipment,
    canReport,
    openReportFor,
    onReportSent,
    // labels
    typeLabel,
    purposeLabel,
    blockTypeLabel,
    formattedDate,
  };
}
