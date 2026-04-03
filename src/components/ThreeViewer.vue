<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const canvasRef = ref<HTMLCanvasElement | null>(null);
let threeApp: any = null;

const emit = defineEmits<{
  'pin-click': [detail: { pinId: string; displayName: string; building: string; floorLevel: number }];
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
