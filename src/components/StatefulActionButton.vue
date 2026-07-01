<script setup lang="ts">
import { computed } from 'vue';
import { Button } from '@/components/ui/button';

/**
 * Primary submit button with an async state machine: idle → submitting →
 * success / error. The parent owns the async call and drives `status`; this
 * component renders the matching label (crossfaded) and the per-state colour,
 * ring, lift and shake. Used by the reservation and blocking flows so both
 * read identically.
 */
export type ActionStatus = 'idle' | 'submitting' | 'success' | 'error';

const props = withDefaults(
  defineProps<{
    status: ActionStatus;
    idleLabel: string;
    submittingLabel: string;
    successLabel: string;
    errorLabel: string;
    /** Form-incomplete: natively disables the button while still idle. */
    disabled?: boolean;
  }>(),
  { disabled: false },
);

const emit = defineEmits<{ click: [] }>();

const label = computed(() => {
  switch (props.status) {
    case 'submitting':
      return props.submittingLabel;
    case 'success':
      return props.successLabel;
    case 'error':
      return props.errorLabel;
    default:
      return props.idleLabel;
  }
});

// Locked once the request is in flight or has succeeded — re-clicks are no-ops.
const isLocked = computed(() => props.status === 'submitting' || props.status === 'success');

function onClick() {
  if (isLocked.value || props.disabled) return;
  emit('click');
}
</script>

<template>
  <Button
    class="stateful-action-button h-11 w-full"
    :data-state="status"
    :disabled="disabled && status === 'idle'"
    :aria-disabled="isLocked"
    :aria-busy="status === 'submitting'"
    @click="onClick"
  >
    <Transition name="stateful-action-label" mode="out-in">
      <span :key="label" class="stateful-action-button__label">
        {{ label }}
      </span>
    </Transition>
  </Button>
</template>

<style scoped>
.stateful-action-button {
  --action-button-bg: var(--primary);
  --action-button-fg: var(--primary-foreground);
  --action-button-shadow: transparent;

  position: relative;
  overflow: hidden;
  background: var(--action-button-bg);
  color: var(--action-button-fg);
  box-shadow: 0 0 0 0 var(--action-button-shadow);
  transition:
    background-color 220ms cubic-bezier(0.22, 1, 0.36, 1),
    color 220ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 260ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 160ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 160ms cubic-bezier(0.22, 1, 0.36, 1);
}

.stateful-action-button:hover:not(:disabled):not([aria-disabled='true']) {
  background: color-mix(in srgb, var(--action-button-bg) 88%, black);
}

.stateful-action-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.stateful-action-button[aria-disabled='true'] {
  cursor: default;
  pointer-events: none;
}

.stateful-action-button[data-state='submitting'] {
  --action-button-bg: var(--info);
  --action-button-fg: white;
  --action-button-shadow: color-mix(in srgb, var(--info) 32%, transparent);

  box-shadow: 0 0 0 4px var(--action-button-shadow);
}

.stateful-action-button[data-state='success'] {
  --action-button-bg: var(--success-solid);
  --action-button-fg: white;
  --action-button-shadow: color-mix(in srgb, var(--success-solid) 40%, transparent);

  box-shadow: 0 0 0 5px var(--action-button-shadow);
  transform: translateY(-1px);
}

.stateful-action-button[data-state='error'] {
  --action-button-bg: var(--destructive);
  --action-button-fg: var(--destructive-foreground);
  --action-button-shadow: color-mix(in srgb, var(--destructive) 28%, transparent);

  animation: stateful-action-error-nudge 260ms cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 0 4px var(--action-button-shadow);
}

.stateful-action-button__label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  will-change: transform, opacity, filter;
}

.stateful-action-label-enter-active {
  transition:
    opacity 190ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 190ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 190ms cubic-bezier(0.22, 1, 0.36, 1);
}

.stateful-action-label-leave-active {
  transition:
    opacity 120ms cubic-bezier(0.4, 0, 0.2, 1),
    filter 120ms cubic-bezier(0.4, 0, 0.2, 1),
    transform 120ms cubic-bezier(0.4, 0, 0.2, 1);
}

.stateful-action-label-enter-from {
  opacity: 0;
  filter: blur(2px);
  transform: translateY(6px);
}

.stateful-action-label-leave-to {
  opacity: 0;
  filter: blur(2px);
  transform: translateY(-6px);
}

@keyframes stateful-action-error-nudge {
  0%,
  100% {
    transform: translateX(0);
  }

  35% {
    transform: translateX(-3px);
  }

  70% {
    transform: translateX(3px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .stateful-action-button,
  .stateful-action-button__label,
  .stateful-action-label-enter-active,
  .stateful-action-label-leave-active {
    animation: none !important;
    transition: none !important;
  }
}
</style>
