<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';

/**
 * Top-edge progress bar shown while a lazy route chunk is downloading (MEL-012).
 * Vue Router holds the navigation until the route's async `import()` resolves, so
 * a bar spanning beforeEach → afterEach covers the "click feels dead" gap on heavy
 * chunks (above all, the Three.js viewer). A short start delay keeps it from
 * flashing on already-cached, near-instant navigations.
 */
const router = useRouter();

const visible = ref(false);
const progress = ref(0);

const START_DELAY = 150; // ms — below this, a navigation is "instant"; show nothing
const TRICKLE_MS = 240;

let startTimer: ReturnType<typeof setTimeout> | null = null;
let trickleTimer: ReturnType<typeof setInterval> | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

function clearTrickle() {
  if (trickleTimer) {
    clearInterval(trickleTimer);
    trickleTimer = null;
  }
}

function begin() {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  if (startTimer) clearTimeout(startTimer);
  startTimer = setTimeout(() => {
    visible.value = true;
    progress.value = 8;
    clearTrickle();
    // Ease toward 90% and stall there until the navigation actually resolves.
    trickleTimer = setInterval(() => {
      const remaining = 90 - progress.value;
      progress.value += Math.max(0.4, remaining * 0.12);
      if (progress.value >= 90) {
        progress.value = 90;
        clearTrickle();
      }
    }, TRICKLE_MS);
  }, START_DELAY);
}

function done() {
  if (startTimer) {
    clearTimeout(startTimer);
    startTimer = null;
  }
  clearTrickle();
  if (!visible.value) return; // navigation was instant — nothing was shown
  progress.value = 100;
  hideTimer = setTimeout(() => {
    visible.value = false;
    progress.value = 0;
  }, 280);
}

let unregisterBefore: (() => void) | null = null;
let unregisterAfter: (() => void) | null = null;
let unregisterError: (() => void) | null = null;

onMounted(() => {
  unregisterBefore = router.beforeEach(() => {
    begin();
  });
  // afterEach fires on completed AND failed/cancelled navigations, so the bar
  // never gets stranded; onError covers chunk-load failures that bypass it.
  unregisterAfter = router.afterEach(() => {
    done();
  });
  unregisterError = router.onError(() => {
    done();
  });
});

onUnmounted(() => {
  unregisterBefore?.();
  unregisterAfter?.();
  unregisterError?.();
  if (startTimer) clearTimeout(startTimer);
  if (hideTimer) clearTimeout(hideTimer);
  clearTrickle();
});
</script>

<template>
  <div v-show="visible" class="route-progress" aria-hidden="true">
    <div class="route-progress__bar" :style="{ width: progress + '%' }" />
  </div>
</template>

<style scoped>
.route-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  z-index: calc(var(--z-toast) + 5);
  pointer-events: none;
  background: transparent;
}

.route-progress__bar {
  height: 100%;
  background: var(--primary);
  border-radius: 0 2px 2px 0;
  box-shadow: 0 0 8px color-mix(in srgb, var(--primary) 70%, transparent);
}

/* The width tween conveys progress; under reduced motion it snaps between states,
   which still reads as "still loading" without animation. */
@media (prefers-reduced-motion: no-preference) {
  .route-progress__bar {
    transition: width 220ms var(--ease-out-quart, ease);
  }
}
</style>
