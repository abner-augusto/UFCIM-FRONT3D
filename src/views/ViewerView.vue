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
import { getCurrentPeriod } from '@/utils/period';
import { usePinAvailability, PERIOD_COLORS } from '@/composables/usePinAvailability';
import type { PeriodKey, PinStatus } from '@/composables/usePinAvailability';
import { BLOCK_TYPE_LABELS, TIME_SLOT_RANGES, type Blocking } from '@/types/reservation';
import { logger } from '@/utils/logger';

const route = useRoute();
const router = useRouter();
const reservationStore = useReservationStore();
const auth = useAuthStore();

const viewerRef = ref<InstanceType<typeof ThreeViewer> | null>(null);
const selectedSpace = ref<Space | null>(null);
const showPopup = ref(false);
const selectedPeriod = ref<PeriodKey>(getCurrentPeriod());
const periodAutoDetected = ref(true);
const today = new Date().toISOString().split('T')[0];
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
let cachedStatusMap = new Map<string, PinStatus>();
const viewerReady = ref(false);
const spacesLoaded = ref(false);
let colorUpdateSeq = 0;
let popupStateSeq = 0;
let popupDetailSeq = 0;

function overlapsSelectedPeriod(blocking: Blocking): boolean {
  const range = TIME_SLOT_RANGES[selectedPeriod.value];
  return blocking.startTime < range.endTime && blocking.endTime > range.startTime;
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

  const pinStatus = space.modelId ? cachedStatusMap.get(space.modelId) : undefined;

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
    popupReserveDisabledReason.value = 'Este espaço está bloqueado para o turno selecionado.';
  }

  if (pinStatus === 'available' || pinStatus === 'partial') {
    return;
  }

  popupReservationStateLoading.value = true;
  try {
    const blockings = await api.getBlockings(auth.token, space.id, today);
    if (seq !== popupStateSeq) return;

    const activeBlocking = blockings.find(
      (blocking) =>
        blocking.status === 'active' &&
        blocking.date === today &&
        overlapsSelectedPeriod(blocking),
    );

    if (activeBlocking) {
      popupReserveDisabled.value = true;
      popupReserveDisabledReason.value = 'Este espaço está bloqueado para o turno selecionado.';
      popupBlockingReason.value = getBlockingReason(activeBlocking);
    }
  } catch {
    if (seq !== popupStateSeq) return;
    popupReserveDisabled.value = true;
    popupReserveDisabledReason.value = 'Não foi possível verificar se o espaço está liberado para reserva.';
  } finally {
    if (seq === popupStateSeq) {
      popupReservationStateLoading.value = false;
    }
  }
}

async function applyPinColors() {
  if (!viewerReady.value || !spacesLoaded.value) return;
  const seq = ++colorUpdateSeq;
  const activeModelIds = new Set(spacesByModelId.keys());
  const statusMap = await fetchStatuses(
    spacesByModelId,
    auth.token,
    today,
    selectedPeriod.value,
  );

  if (seq !== colorUpdateSeq) return;

  cachedStatusMap = statusMap;

  const colorMap = new Map<string, string>();
  for (const [modelId, status] of statusMap.entries()) {
    colorMap.set(modelId, PERIOD_COLORS[status]);
  }

  viewerRef.value?.filterPinsToBackendSpaces(activeModelIds, colorMap);

  for (const modelId of activeModelIds) {
    const status = statusMap.get(modelId);
    // Dimmed pins (blocked/not_reservable) stay visible but at 60% opacity
    const opacity = (status === 'blocked' || status === 'not_reservable') ? 0.8 : 1;
    viewerRef.value?.applyPinOpacity(modelId, opacity);
  }
}

function handleViewerReady() {
  viewerReady.value = true;
  applyPinColors();
}

function handlePeriodChange(period: PeriodKey) {
  periodAutoDetected.value = period === getCurrentPeriod();
  selectedPeriod.value = period;
}

function onFullscreenToggle(on: boolean) {
  fullscreen.value = on;
  viewerRef.value?.setFullscreen(on);
}

onMounted(async () => {
  mql.addEventListener('change', onResize);

  const campusId = route.params.campusId as string;
  // Backend stores campus as the shortName (e.g. "Benfica"), not the route id ("benfica")
  const campusFilter = campuses.find(c => c.id === campusId)?.shortName ?? campusId;
  try {
    const spaces = await api.listSpaces(auth.token, { campus: campusFilter, limit: '100' });
    for (const space of spaces) {
      if (space.modelId) spacesByModelId.set(space.modelId, space);
    }
    // Feed backend space data into viewer search
    viewerRef.value?.setSearchData(
      spaces.map((s) => ({
        modelId: s.modelId,
        name: s.name,
        number: s.number,
        block: s.block,
        type: s.type,
        reservable: s.reservable,
      })),
    );
  } catch (e) {
    logger.error('Falha ao carregar espaços:', e);
  } finally {
    spacesLoaded.value = true;
    applyPinColors();
  }
});

onUnmounted(() => {
  mql.removeEventListener('change', onResize);
});

watch(selectedPeriod, () => {
  applyPinColors();
  if (showPopup.value && selectedSpace.value) {
    updatePopupReservationState(selectedSpace.value);
  }
});

async function handlePinClick(detail: { pinId: string; displayName: string; building: string; floorLevel: number }) {
  const summarySpace = spacesByModelId.get(detail.pinId);
  if (!summarySpace) return; // pin has no matching space — reference-only pin
  const seq = ++popupDetailSeq;
  selectedSpace.value = summarySpace;
  showPopup.value = true;
  viewerRef.value?.setFloorUIVisible(false);
  try {
    const detailedSpace = await api.getSpace(auth.token, summarySpace.id);
    if (seq !== popupDetailSeq || !showPopup.value) return;
    selectedSpace.value = detailedSpace;
    await updatePopupReservationState(detailedSpace);
  } catch {
    if (seq !== popupDetailSeq || !showPopup.value) return;
    await updatePopupReservationState(summarySpace);
  }
}

function handleReserve() {
  if (!selectedSpace.value) return;
  reservationStore.setSpace(selectedSpace.value.id, selectedSpace.value.name);
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
    <ThreeViewer ref="viewerRef" @ready="handleViewerReady" @pin-click="handlePinClick" />
    
    <PeriodSelector
      v-if="!isMobile"
      :modelValue="selectedPeriod"
      :loading="availabilityLoading"
      :autoDetected="periodAutoDetected"
      @update:modelValue="handlePeriodChange"
    />

    <ViewerControlsRail
      v-if="isMobile"
      :viewer-ref="viewerRef"
      :ready="viewerReady"
      :modelValue="selectedPeriod"
      @update:modelValue="handlePeriodChange"
      :fullscreen="fullscreen"
      @update:fullscreen="onFullscreenToggle"
      @open-search="searchSheetOpen = true"
    />

    <ViewerSearchSheet
      :open="searchSheetOpen"
      @close="searchSheetOpen = false"
    />

    <RoomPopup
      v-if="showPopup && selectedSpace"
      :space="selectedSpace"
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
  height: calc(100vh - var(--header-offset)); /* fallback */
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
    height: calc(100vh  - var(--header-offset) - var(--bottom-bar-h) - var(--safe-bottom)); /* fallback */
    height: calc(100dvh - var(--header-offset) - var(--bottom-bar-h) - var(--safe-bottom));
  }
  
  .viewer-view--fullscreen {
    height: 100vh;
    height: 100dvh;
  }
}
</style>
