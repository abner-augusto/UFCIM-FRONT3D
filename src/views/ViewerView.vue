<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useReservationStore } from '@/stores/reservation';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/services/api';
import type { Space } from '@/types/space';
import { campuses } from '@/data/campuses';
import ThreeViewer from '@/components/ThreeViewer.vue';
import RoomPopup from '@/components/RoomPopup.vue';
import PeriodSelector from '@/components/PeriodSelector.vue';
import ViewerControlsRail from '@/components/ViewerControlsRail.vue';
import ViewerSearchSheet from '@/components/ViewerSearchSheet.vue';
import BlockHeatmapCard from '@/components/BlockHeatmapCard.vue';
import { useDateTimeFilter, formatShortDate } from '@/composables/useDateTimeFilter';
import { usePinAvailability, PERIOD_COLORS } from '@/composables/usePinAvailability';
import { buildPinStatusLabel } from '@/composables/usePinStatusLabel';
import type { PeriodKey, PinStatus } from '@/composables/usePinAvailability';
import { BLOCK_TYPE_LABELS, TIME_SLOT_RANGES, type Blocking } from '@/types/reservation';
import { logger } from '@/utils/logger';

const route = useRoute();
const router = useRouter();
const reservationStore = useReservationStore();
const auth = useAuthStore();

const campusId = route.params.campusId as string;
const campus = campuses.find((c) => c.id === campusId);
const campusFilter = campus?.shortName ?? campusId;

const {
  selectedDate, selectedPeriod, periodAutoDetected,
  isToday, periodRange, defaultStartTime, defaultEndTime, today,
  setDate, setPeriod,
} = useDateTimeFilter();

const viewerRef = ref<InstanceType<typeof ThreeViewer> | null>(null);
const selectedSpace = ref<Space | null>(null);
const showPopup = ref(false);
const { loading: availabilityLoading, fetchStatuses } = usePinAvailability();
const popupReserveDisabled = ref(false);
const popupReserveDisabledReason = ref<string | null>(null);
const popupBlockingReason = ref<string | null>(null);
const popupReservationStateLoading = ref(false);

const fullscreen = ref(false);
const searchSheetOpen = ref(false);
const isMobile = ref(window.matchMedia('(max-width: 480px)').matches);

const mql = window.matchMedia('(max-width: 480px)');
const onResize = (e: MediaQueryListEvent | MediaQueryList) => {
  isMobile.value = e.matches;
};

// Map<modelId, Space> — built on mount, used for O(1) pin lookup
const spacesByModelId = new Map<string, Space>();
let cachedStatusMap = new Map<string, { status: PinStatus; slots: Array<{ startTime: string; endTime: string; status: string }> }>();
const viewerReady = ref(false);
const spacesLoaded = ref(false);
let colorUpdateSeq = 0;
let popupStateSeq = 0;
let popupDetailSeq = 0;

// Block heatmap
const activeBuildingId = ref<string | null>(null);
const activeBuildingName = ref('');
const spaces = ref<Space[]>([]);

const spacesInActiveBlock = ref<Space[]>([]);

// The 3D layer reports the manifest building id ("bloco1", "pavilhao"), while
// the backend stores a display block name ("Bloco 1", "Pavilhão"). Normalize
// both to a canonical key so they can be matched.
function normalizeBlockKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');      // strip spaces & punctuation
}

function updateBlockHeatmap() {
  if (!activeBuildingId.value) {
    spacesInActiveBlock.value = [];
    activeBuildingName.value = '';
    return;
  }
  const key = normalizeBlockKey(activeBuildingId.value);
  spacesInActiveBlock.value = spaces.value.filter(s => normalizeBlockKey(s.block) === key);
  // Prefer the backend block name ("Bloco 1") for the card title; fall back to the raw id.
  activeBuildingName.value = spacesInActiveBlock.value[0]?.block ?? activeBuildingId.value;
}

function overlapsSelectedPeriod(blocking: Blocking): boolean {
  const range = TIME_SLOT_RANGES[selectedPeriod.value];
  return blocking.startTime < range.endTime && blocking.endTime > range.startTime;
}

function onFullscreenToggle(on: boolean) {
  fullscreen.value = on;
  // The actual fullscreen effect (hiding the app shell, 100dvh viewer) is
  // driven by the body.viewer-fullscreen class toggled here.
  viewerRef.value?.setFullscreen(on);
}

function getBlockingReason(blocking: Blocking): string {
  const typeLabel = BLOCK_TYPE_LABELS[blocking.blockType];
  const reason = blocking.reason?.trim();
  return reason ? `${typeLabel}: ${reason}` : typeLabel;
}

async function updatePopupReservationState(space: Space) {
  const seq = ++popupStateSeq;
  popupReserveDisabled.value = false;
  popupReserveDisabledReason.value = null;
  popupBlockingReason.value = null;
  popupReservationStateLoading.value = false;

  if (!space.reservable) {
    popupReserveDisabled.value = true;
    popupReserveDisabledReason.value = 'Este espaço não está disponível para reservas.';
    return;
  }

  const pinData = space.modelId ? cachedStatusMap.get(space.modelId) : undefined;
  const pinStatus = pinData?.status;

  if (pinStatus === 'not_reservable') {
    popupReserveDisabled.value = true;
    popupReserveDisabledReason.value = 'Este espaço não está disponível para reservas.';
    return;
  }

  if (pinStatus === 'closed') {
    popupReserveDisabled.value = true;
    popupReserveDisabledReason.value = 'Este espaço está fechado neste turno.';
    return;
  }

  if (pinStatus === 'reserved') {
    popupReserveDisabled.value = true;
    popupReserveDisabledReason.value = 'Este espaço já está totalmente reservado neste turno.';
    return;
  }

  if (pinStatus === 'blocked') {
    popupReserveDisabled.value = true;
    popupReservationStateLoading.value = true;
    try {
      const blockings = await api.getBlockings(auth.token, space.id, selectedDate.value);
      if (seq !== popupStateSeq) return;
      const periodBlocking = blockings.find(b => overlapsSelectedPeriod(b));
      popupBlockingReason.value = periodBlocking ? getBlockingReason(periodBlocking) : 'Este espaço está bloqueado neste turno.';
    } catch (e) {
      logger.warn('[PopupState] Failed to fetch blockings for space', space.id, e);
      if (seq !== popupStateSeq) return;
      popupBlockingReason.value = 'Este espaço está bloqueado neste turno.';
    } finally {
      if (seq === popupStateSeq) popupReservationStateLoading.value = false;
    }
    return;
  }
}

async function applyPinColors() {
  const seq = ++colorUpdateSeq;
  if (!spacesLoaded.value) return;
  try {
    cachedStatusMap = await fetchStatuses(spacesByModelId, auth.token, selectedDate.value, selectedPeriod.value);
    if (seq !== colorUpdateSeq) return;
    const colorMap = new Map<string, string>();
    cachedStatusMap.forEach(({ status }, modelId) => {
      colorMap.set(modelId, PERIOD_COLORS[status]);
    });
    viewerRef.value?.applyBackendFilter(new Set(cachedStatusMap.keys()), colorMap);

    // Update pin labels with status
    if (viewerRef.value?.updatePinLabelStatus) {
      cachedStatusMap.forEach(({ status, slots }, modelId) => {
        const labelInfo = buildPinStatusLabel(status, slots, periodRange.value);
        viewerRef.value!.updatePinLabelStatus!(modelId, labelInfo.statusText, labelInfo.statusColor);
      });
    }
  } catch (e) {
    logger.error('Falha ao atualizar cores:', e);
  }
}

function handlePeriodChange(period: PeriodKey) {
  setPeriod(period);
}

function handleDateChange(date: string) {
  setDate(date);
}

// Feed the legacy 3D floor-UI search box (desktop) with backend spaces.
// No-ops until both the viewer and the spaces list are ready, so it's called
// from both the ready and the spaces-loaded paths to cover either ordering.
function pushSearchData() {
  if (!spacesLoaded.value) return;
  viewerRef.value?.setSearchData(spaces.value);
}

const handleViewerReady = () => {
  viewerReady.value = true;
  if (spacesLoaded.value) {
    applyPinColors();
    pushSearchData();
  }
};

watch([selectedDate, selectedPeriod], () => {
  applyPinColors();
  if (showPopup.value && selectedSpace.value) {
    updatePopupReservationState(selectedSpace.value);
  }
  updateBlockHeatmap();
});

onMounted(async () => {
  mql.addEventListener('change', onResize);
  try {
    spaces.value = await api.listSpaces(auth.token, {
      campus: campusFilter,
      limit: '100',
      ...(route.query.block ? { block: route.query.block as string } : {}),
    });

    for (const s of spaces.value) {
      if (s.modelId) spacesByModelId.set(s.modelId, s);
    }
  } catch (e) {
    logger.error('Falha ao carregar espaços:', e);
  } finally {
    spacesLoaded.value = true;
    applyPinColors();
    pushSearchData();
  }

  // Listen for building changes
  window.addEventListener('ufcim:building-changed', ((e: CustomEvent) => {
    activeBuildingId.value = e.detail?.buildingID ?? null;
    updateBlockHeatmap();
  }) as EventListener);
});

onUnmounted(() => {
  mql.removeEventListener('change', onResize);
});

async function handlePinClick(detail: { pinId: string; displayName: string; building: string; floorLevel: number }) {
  const summarySpace = spacesByModelId.get(detail.pinId);
  if (!summarySpace) {
    logger.warn(`[PinClick] No space matched pinId "${detail.pinId}". spacesByModelId has ${spacesByModelId.size} entries:`, [...spacesByModelId.keys()]);
    return;
  }
  const seq = ++popupDetailSeq;
  selectedSpace.value = summarySpace;
  showPopup.value = true;
  searchSheetOpen.value = false;
  viewerRef.value?.setFloorUIVisible(false);
  try {
    const detailedSpace = await api.getSpace(auth.token, summarySpace.id);
    if (seq !== popupDetailSeq || !showPopup.value) return;
    selectedSpace.value = detailedSpace;
    await updatePopupReservationState(detailedSpace);
  } catch (e) {
    logger.warn('[PinClick] Failed to fetch detailed space, falling back to summary:', e);
    if (seq !== popupDetailSeq || !showPopup.value) return;
    await updatePopupReservationState(summarySpace);
  }
}

function handleReserve() {
  if (!selectedSpace.value) return;
  reservationStore.setSpace(selectedSpace.value.id, selectedSpace.value.name);
  reservationStore.setCustomSchedule(selectedDate.value, defaultStartTime.value, defaultEndTime.value);
  router.push({ name: 'reservation', params: { spaceId: selectedSpace.value.id } });
}

function handleBlock() {
  if (!selectedSpace.value) return;
  router.push({ name: 'blocking-create', params: { spaceId: selectedSpace.value.id } });
}

function closePopup() {
  popupDetailSeq += 1;
  popupStateSeq += 1;
  showPopup.value = false;
  selectedSpace.value = null;
  popupReserveDisabled.value = false;
  popupReserveDisabledReason.value = null;
  popupBlockingReason.value = null;
  popupReservationStateLoading.value = false;
  viewerRef.value?.setFloorUIVisible(true);
}
</script>

<template>
  <div class="viewer-view" :class="{ 'viewer-view--fullscreen': fullscreen }">
    <BlockHeatmapCard
      v-if="isMobile"
      :visible="!!activeBuildingId"
      :block-name="activeBuildingName"
      :date-label="isToday ? 'hoje' : formatShortDate(selectedDate)"
      :spaces="spacesInActiveBlock"
      :date="selectedDate"
      :closed-from="'07:00'"
      :closed-to="'23:00'"
    />
    <ThreeViewer ref="viewerRef" @ready="handleViewerReady" @pin-click="handlePinClick" />
    
    <PeriodSelector
      v-if="!isMobile"
      :modelValue="selectedPeriod"
      :selectedDate="selectedDate"
      :today="today"
      :loading="availabilityLoading"
      :autoDetected="periodAutoDetected"
      @update:modelValue="handlePeriodChange"
      @update:selectedDate="handleDateChange"
    />

    <ViewerControlsRail
      v-if="isMobile"
      :viewer-ref="viewerRef"
      :ready="viewerReady"
      :selected-date="selectedDate"
      :selected-period="selectedPeriod"
      :period-auto-detected="periodAutoDetected"
      @update:selectedDate="handleDateChange"
      @update:selectedPeriod="handlePeriodChange"
      :fullscreen="fullscreen"
      @update:fullscreen="onFullscreenToggle"
      @open-search="searchSheetOpen = true"
    />

    <ViewerSearchSheet
      :open="searchSheetOpen"
      :spaces="spaces"
      @close="searchSheetOpen = false"
      @select="(modelId) => { viewerRef?.navigateToPin(modelId); searchSheetOpen = false; }"
    />

    <RoomPopup
      v-if="showPopup && selectedSpace"
      :space="selectedSpace"
      :selected-date="selectedDate"
      :selected-start-time="defaultStartTime"
      :selected-end-time="defaultEndTime"
      :reserve-disabled="popupReserveDisabled"
      :reserve-disabled-reason="popupReserveDisabledReason"
      :blocking-reason="popupBlockingReason"
      :loading-reservation-state="popupReservationStateLoading"
      :blocking-allowed="selectedSpace.reservable"
      @close="closePopup"
      @reserve="handleReserve"
      @block="handleBlock"
    />
  </div>
</template>

<style scoped>
.viewer-view {
  height: calc(100vh - var(--header-offset));
  height: calc(100dvh - var(--header-offset));
  overflow: hidden;
  position: relative;
  width: 100vw;
}

.viewer-view--fullscreen {
  height: 100vh;
  height: 100dvh;
}

@media (max-width: 1023px) {
  .viewer-view {
    height: calc(100vh  - var(--header-offset) - var(--bottom-bar-h) - var(--safe-bottom));
    height: calc(100dvh - var(--header-offset) - var(--bottom-bar-h) - var(--safe-bottom));
  }
  
  .viewer-view--fullscreen {
    height: 100vh;
    height: 100dvh;
  }
}
</style>
