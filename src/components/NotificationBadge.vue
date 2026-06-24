<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';

const props = defineProps<{
  count: number;
}>();

const visibleCount = ref(props.count > 0 ? props.count : 0);
const animateDigits = ref(false);
const digitGroup = ref<HTMLElement | null>(null);
const isOpen = computed(() => props.count > 0);
const label = computed(() => {
  return visibleCount.value >= 100 ? '99+' : String(visibleCount.value);
});
const labelChars = computed(() => label.value.split(''));

watch(() => props.count, async (count, previousCount) => {
  if (count <= 0) return;

  visibleCount.value = count;

  if (count <= previousCount) return;

  animateDigits.value = false;
  await nextTick();
  void digitGroup.value?.offsetWidth;
  animateDigits.value = true;
});
</script>

<template>
  <span class="notif-badge" :data-open="isOpen ? 'true' : 'false'" aria-hidden="true">
    <span class="notif-badge__dot">
      <span ref="digitGroup" class="notif-badge__digits" :class="{ 'is-animating': animateDigits }">
        <span
          v-for="(char, index) in labelChars"
          :key="`${char}-${index}`"
          class="notif-badge__digit"
          :data-stagger="index || undefined"
          :style="index ? { animationDelay: `calc(var(--digit-stagger) * ${index})` } : undefined"
        >{{ char }}</span>
      </span>
    </span>
  </span>
</template>

<style scoped>
.notif-badge {
  --badge-pop-dur: 500ms;
  --badge-pop-close-dur: 180ms;
  --badge-fade-dur: 400ms;
  --badge-fade-close-dur: 180ms;
  --badge-blur: 2px;
  --badge-pop-ease: cubic-bezier(0.34, 1.36, 0.64, 1);
  --badge-close-ease: cubic-bezier(0.4, 0, 0.2, 1);
  --digit-dur: 500ms;
  --digit-distance: 8px;
  --digit-stagger: 70ms;
  --digit-blur: 2px;
  --digit-ease: cubic-bezier(0.34, 1.45, 0.64, 1);
  --digit-dir-x: 0;
  --digit-dir-y: 1;

  position: absolute;
  top: -18px;
  right: -15px;
  pointer-events: none;
  will-change: transform;
}

.notif-badge__dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--destructive);
  color: var(--destructive-foreground);
  font-size: 0.65rem;
  font-weight: 700;
  line-height: 1;
  opacity: 1;
  filter: blur(0);
  transform: scale(1);
  transform-origin: center;
  transition:
    transform var(--badge-pop-dur) var(--badge-pop-ease),
    opacity var(--badge-fade-dur) var(--badge-pop-ease),
    filter var(--badge-pop-dur) var(--badge-pop-ease);
  will-change: transform, opacity, filter;
}

.notif-badge[data-open='false'] .notif-badge__dot {
  opacity: 0;
  filter: blur(var(--badge-blur));
  transform: scale(0);
  transition:
    transform var(--badge-pop-close-dur) var(--badge-close-ease),
    opacity var(--badge-fade-close-dur) var(--badge-close-ease),
    filter var(--badge-pop-close-dur) var(--badge-close-ease);
}

.notif-badge__digits {
  display: inline-flex;
  align-items: baseline;
}

.notif-badge__digit {
  display: inline-block;
  will-change: transform, opacity, filter;
}

.notif-badge__digits.is-animating .notif-badge__digit {
  animation: notif-badge-digit-pop-in var(--digit-dur) var(--digit-ease) both;
}

@keyframes notif-badge-digit-pop-in {
  0% {
    opacity: 0;
    filter: blur(var(--digit-blur));
    transform: translate(
      calc(var(--digit-distance) * var(--digit-dir-x)),
      calc(var(--digit-distance) * var(--digit-dir-y))
    );
  }

  100% {
    opacity: 1;
    filter: blur(0);
    transform: translate(0, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .notif-badge,
  .notif-badge__dot,
  .notif-badge__digit {
    animation: none !important;
    transition: none !important;
  }
}
</style>
