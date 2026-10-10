import { ref, computed, onMounted, watch, toValue, type Ref, type MaybeRefOrGetter } from 'vue';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { SPACE_TYPE_LABELS, type Space, type Equipment } from '@/types/space';
import { PURPOSE_LABELS, BLOCK_TYPE_LABELS, type Availability } from '@/types/reservation';
import { useAvailabilitySelection } from '@/composables/useAvailabilitySelection';
import { useEquipmentGroups, type EquipmentGroup } from '@/composables/useEquipmentGroups';
import type { MaintenanceCategory, OpenReportStatus } from '@/types/equipment-report';
import { openRoomReportList } from '@/utils/maintenance-tickets';

/** An equipment group the user can still report, with the item that gets the ticket. */
export interface ReportableEquipment {
  name: string;
  equipment: Equipment;
}

/** What a sent ticket was about, for the optimistic overlay. */
export type ReportedTarget =
  | { kind: 'equipment'; equipmentId: string }
  | { kind: 'room'; category: MaintenanceCategory };

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

  // Equipment grouping + status helpers.
  // Optimistic overlay: the API only re-exposes openReportStatus on the next
  // space fetch, so a just-sent report is reflected locally (MEL-015).
  const overlayOpenReports = ref(new Map<string, 'pending'>());
  const spaceWithOverlay = computed<Space | null>(() => {
    const current = space.value;
    if (!overlayOpenReports.value.size || !current?.equipment?.length) return current;
    return {
      ...current,
      equipment: current.equipment.map((item) => ({
        ...item,
        openReportStatus: overlayOpenReports.value.get(item.id) ?? item.openReportStatus ?? null,
      })),
    };
  });

  const {
    equipmentGroups,
    groupSeverity,
    groupStatusLabel,
    groupReportState,
    reportStatusLabel,
  } = useEquipmentGroups(() => spaceWithOverlay.value);
  const groupStatusClass = (g: EquipmentGroup) => `eq-status--${groupSeverity(g)}`;

  // Room tickets by category (MEL-026), with the same optimistic overlay, keyed
  // by space because the popup can switch rooms without remounting.
  type RoomStatus = Partial<Record<MaintenanceCategory, OpenReportStatus>>;
  const overlayRoomReports = ref<Record<string, RoomStatus>>({});
  const roomReportStatus = computed<RoomStatus>(() => ({
    ...(space.value?.openRoomReportStatus ?? {}),
    ...(overlayRoomReports.value[space.value?.id] ?? {}),
  }));
  const openRoomReports = computed(() => openRoomReportList(roomReportStatus.value));

  // Reporting: the dialog opens on a given equipment (its row's "Reportar"),
  // or on the first step, where the user picks equipment or room.
  const reportingEquipment = ref<Equipment | null>(null);
  const reportDialogOpen = ref(false);
  const canReport = computed(() => !!auth.token);

  /** First item of the group that still has no open report (group-level guard). */
  function reportableItem(group: EquipmentGroup): Equipment | undefined {
    return spaceWithOverlay.value?.equipment?.find(
      (equipment) => equipment.name === group.name && !equipment.openReportStatus,
    );
  }
  const reportableEquipment = computed<ReportableEquipment[]>(() =>
    equipmentGroups.value.flatMap((group) => {
      const item = groupReportState(group) === 'none' ? reportableItem(group) : undefined;
      return item ? [{ name: group.name, equipment: item }] : [];
    }),
  );

  function openReportFor(group: EquipmentGroup) {
    const item = reportableItem(group);
    if (!item) return;
    reportingEquipment.value = item;
    reportDialogOpen.value = true;
  }
  function openRoomReport() {
    reportingEquipment.value = null;
    reportDialogOpen.value = true;
  }
  function closeReport() {
    reportDialogOpen.value = false;
    reportingEquipment.value = null;
  }
  function onReportSent(target: ReportedTarget) {
    if (target.kind === 'equipment') {
      const next = new Map(overlayOpenReports.value);
      next.set(target.equipmentId, 'pending');
      overlayOpenReports.value = next;
    } else {
      const id = space.value.id;
      overlayRoomReports.value = {
        ...overlayRoomReports.value,
        [id]: { ...overlayRoomReports.value[id], [target.category]: 'pending' },
      };
    }
    closeReport();
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
    groupReportState,
    reportStatusLabel,
    // report
    reportingEquipment,
    reportDialogOpen,
    reportableEquipment,
    roomReportStatus,
    openRoomReports,
    canReport,
    openReportFor,
    openRoomReport,
    closeReport,
    onReportSent,
    // labels
    typeLabel,
    purposeLabel,
    blockTypeLabel,
    formattedDate,
  };
}
