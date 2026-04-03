<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useReservationStore } from '@/stores/reservation';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/services/api';
import type { Space } from '@/types/space';
import ThreeViewer from '@/components/ThreeViewer.vue';
import RoomPopup from '@/components/RoomPopup.vue';

const route = useRoute();
const router = useRouter();
const reservationStore = useReservationStore();
const auth = useAuthStore();

const viewerRef = ref<InstanceType<typeof ThreeViewer> | null>(null);
const selectedSpace = ref<Space | null>(null);
const showPopup = ref(false);

// Map<modelId, Space> — built on mount, used for O(1) pin lookup
const spacesByModelId = new Map<string, Space>();

onMounted(async () => {
  const campusId = route.params.campusId as string;
  try {
    const result = await api.listSpaces(auth.token, { campus: campusId });
    for (const space of result.data) {
      if (space.modelId) spacesByModelId.set(space.modelId, space);
    }
  } catch (e) {
    console.error('Falha ao carregar espaços:', e);
  }
});

function handlePinClick(detail: { pinId: string; displayName: string; building: string; floorLevel: number }) {
  const space = spacesByModelId.get(detail.pinId);
  if (!space) return; // pin has no matching space — reference-only pin
  selectedSpace.value = space;
  showPopup.value = true;
}

function handleReserve() {
  if (!selectedSpace.value) return;
  reservationStore.setSpace(selectedSpace.value.id, selectedSpace.value.name);
  router.push({ name: 'reservation', params: { spaceId: selectedSpace.value.id } });
}

function closePopup() {
  showPopup.value = false;
  selectedSpace.value = null;
}
</script>

<template>
  <div class="viewer-view">
    <ThreeViewer ref="viewerRef" @pin-click="handlePinClick" />
    <RoomPopup
      v-if="showPopup && selectedSpace"
      :space="selectedSpace"
      @close="closePopup"
      @reserve="handleReserve"
    />
  </div>
</template>

<style scoped>
.viewer-view {
  position: relative;
  width: 100vw;
  height: calc(100vh - 52px); /* subtract header height */
  overflow: hidden;
}
</style>
