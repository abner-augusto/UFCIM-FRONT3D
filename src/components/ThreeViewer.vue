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

  // Hand off popup rendering to Vue
  if (threeApp.popupManager) {
    threeApp.popupManager.vueManaged = true;
  }

  window.addEventListener('ufcim:pin-click', onPinClick);
  emit('ready');
});

onUnmounted(() => {
  window.removeEventListener('ufcim:pin-click', onPinClick);

  if (threeApp) {
    threeApp.dispose();
    threeApp = null;
  }
});

defineExpose({
  getAPI: () => threeApp?.api ?? null,
  filterPinsToBackendSpaces: (activeModelIds: Set<string>, colorMap?: Map<string, string>) => {
    threeApp?.interactionManager?.applyBackendFilter(activeModelIds, colorMap ?? new Map());
  },
  applyPinOpacity: (pinId: string, opacity: number) => {
    threeApp?.interactionManager?.setPinOpacity(pinId, opacity);
  },
  setFloorUIVisible: (visible: boolean) => {
    threeApp?.uiManager?.toggleFloorUI(visible);
  },
  setSearchData: (spaces: Array<{ modelId: string | null; name: string; number: string; block: string; type: string; reservable: boolean }>) => {
    threeApp?.uiManager?.setSearchSpaces(spaces);
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
}
</style>
