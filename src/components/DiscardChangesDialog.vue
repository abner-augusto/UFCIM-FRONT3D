<script setup lang="ts">
import { nextTick, ref, watch, type ComponentPublicInstance } from 'vue';
import { useMediaQuery } from '@vueuse/core';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  'update:open': [open: boolean];
  keep: [];
  discard: [];
}>();

const isDesktop = useMediaQuery('(min-width: 768px)');
const keepButtonRef = ref<ComponentPublicInstance | null>(null);

function focusKeepButton() {
  const el = keepButtonRef.value?.$el as HTMLElement | undefined;
  el?.focus();
}

watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen) return;
    await nextTick();
    focusKeepButton();
  },
);

function handleOpenChange(nextOpen: boolean) {
  emit('update:open', nextOpen);
  if (!nextOpen) emit('keep');
}

function handleKeep() {
  emit('update:open', false);
  emit('keep');
}

function handleDiscard() {
  emit('update:open', false);
  emit('discard');
}
</script>

<template>
  <component :is="isDesktop ? Dialog : Drawer" :open="open" @update:open="handleOpenChange">
    <component
      :is="isDesktop ? DialogContent : DrawerContent"
      class="discard-dialog z-[var(--z-popover)]"
      :class="isDesktop ? '' : 'mx-2 mb-[calc(0.5rem_+_var(--safe-bottom))]'"
      :show-close-button="false"
      overlay-class="z-[var(--z-popover)] supports-backdrop-filter:backdrop-blur-none"
      @open-auto-focus.prevent="focusKeepButton"
    >
      <div class="discard-dialog__body">
        <component :is="isDesktop ? DialogTitle : DrawerTitle" class="discard-dialog__title">
          Descartar o que foi preenchido?
        </component>
        <component :is="isDesktop ? DialogDescription : DrawerDescription" class="discard-dialog__description">
          As alterações feitas ainda não foram salvas e serão perdidas.
        </component>

        <div class="discard-dialog__actions">
          <Button
            ref="keepButtonRef"
            type="button"
            variant="default"
            class="discard-dialog__button"
            @click="handleKeep"
          >
            Continuar editando
          </Button>
          <Button
            type="button"
            variant="destructive"
            class="discard-dialog__button discard-dialog__button--danger"
            @click="handleDiscard"
          >
            Descartar
          </Button>
        </div>
      </div>
    </component>
  </component>
</template>

<!-- Non-scoped: targets the vaul drawer root, which does not receive this component's scoped attr. -->
<style>
.discard-dialog[data-vaul-drawer]::after { content: none !important; }
</style>

<style scoped>
.discard-dialog {
  background: var(--popover);
  border-radius: 20px;
  padding: 1.5rem;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 12px 40px rgb(var(--shadow-color) / 0.18);
  position: relative;
  padding-bottom: calc(1.5rem + var(--safe-bottom, 0px));
}

.discard-dialog[data-state="open"] {
  animation: discard-dialog-in 0.25s var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1)) both;
}

.discard-dialog[data-state="closed"] {
  animation: discard-dialog-out 0.16s ease-in both;
}

.discard-dialog::before {
  content: '';
  display: block;
  width: 36px;
  height: 4px;
  background: var(--border);
  border-radius: 2px;
  margin: 0 auto 1rem;
}

.discard-dialog__body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.discard-dialog__title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--foreground);
  margin: 0;
}

.discard-dialog__description {
  color: var(--muted-foreground);
  font-size: 0.85rem;
  margin: -0.6rem 0 0;
}

.discard-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.discard-dialog__button {
  min-width: 9rem;
  min-height: var(--tap-min, 44px);
}

.discard-dialog__button--danger {
  background: var(--destructive);
  color: var(--destructive-foreground);
}

.discard-dialog__button--danger:hover {
  background: color-mix(in srgb, var(--destructive) 88%, black);
}

@media (max-width: 480px) {
  .discard-dialog {
    max-width: none;
    padding: 0 1.5rem 1.5rem;
    padding-bottom: calc(1.5rem + var(--safe-bottom, 0px));
  }

  .discard-dialog__actions {
    flex-direction: column-reverse;
  }

  .discard-dialog__button {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .discard-dialog[data-state="open"],
  .discard-dialog[data-state="closed"] {
    animation: none !important;
  }
}

@keyframes discard-dialog-in {
  from { opacity: 0; translate: 0 20px; scale: 0.96; }
  to { opacity: 1; translate: 0 0; scale: 1; }
}

@keyframes discard-dialog-out {
  from { opacity: 1; translate: 0 0; scale: 1; }
  to { opacity: 0; translate: 0 10px; scale: 0.97; }
}
</style>
