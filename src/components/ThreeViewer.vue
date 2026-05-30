<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const canvasRef = ref<HTMLCanvasElement | null>(null);
let threeApp: any = null;

const emit = defineEmits<{
  'pin-click': [detail: { pinId: string; displayName: string; building: string; floorLevel: number }];
  'ready': [];
}>();

function onPinClick(event: Event) {
  const detail = (event as CustomEvent).detail;
  emit('pin-click', detail);
}

onMounted(async () => {
  if (!canvasRef.value) return;

  // Dynamic import to code-split the heavy Three.js bundle
  // @ts-expect-error — legacy JS module, no types
  const { App } = await import('@/three/App.js');
  threeApp = new App(canvasRef.value);
  await threeApp.init();

  window.addEventListener('ufcim:pin-click', onPinClick);
  emit('ready');
});

onUnmounted(() => {
  window.removeEventListener('ufcim:pin-click', onPinClick);
  // Ensure fullscreen mode doesn't leak to other views if we unmount while active.
  document.body.classList.remove('viewer-fullscreen');

  if (threeApp) {
    threeApp.dispose();
    threeApp = null;
  }
});

defineExpose({
  applyBackendFilter: (activeModelIds: Set<string>, colorMap?: Map<string, string>) => {
    threeApp?.interactionManager?.applyBackendFilter(activeModelIds, colorMap ?? new Map());
  },
  updatePinLabelStatus: (pinId: string, statusText: string | null, statusColor: string | null) => {
    threeApp?.interactionManager?.updatePinLabelStatus(pinId, statusText, statusColor);
  },
  navigateToPin: (modelId: string) => threeApp?.uiManager?.navigateToSpaceByModelId(modelId),
  selectBuilding: (id: string | null) => threeApp?.uiManager?.selectBuilding(id),
  selectFloor: (level: number) => threeApp?.uiManager?.selectFloor(level),
  getBuildingsList: () => threeApp?.uiManager?.getBuildingsList() ?? [],
  getFloorsForBuilding: (id: string) => threeApp?.uiManager?.getFloorsForBuilding(id) ?? [],
  getActiveBuildingId: () => threeApp?.uiManager?.getActiveBuildingId() ?? null,
  getActiveFloorLevel: () => threeApp?.uiManager?.getActiveFloorLevel() ?? null,
  setFullscreen: (on: boolean) => {
    document.body.classList.toggle('viewer-fullscreen', on);
  },
});
</script>

<template>
  <canvas ref="canvasRef" class="webgl"></canvas>
</template>

<style scoped>
.webgl {
  width: 100%;
  height: 100%;
  display: block;
  touch-action: none;
}
</style>
