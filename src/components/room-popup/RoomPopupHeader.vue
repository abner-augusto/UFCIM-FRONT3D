<script setup lang="ts">
import type { Space } from '@/types/space';
import { DialogTitle } from '@/components/ui/dialog';
import { DrawerTitle } from '@/components/ui/drawer';

defineProps<{
  space: Space;
  typeLabel: string;
  isDesktop: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();
</script>

<template>
  <button class="room-popup__close" @click="emit('close')" aria-label="Fechar popup">&times;</button>

  <component :is="isDesktop ? DialogTitle : DrawerTitle" class="room-popup__title">
    {{ space.name }}
    <span class="room-popup__number">{{ space.number }}</span>
  </component>
  <p class="room-popup__meta">
    <span>{{ typeLabel }}</span>
    <span class="meta-sep">·</span>
    <span>{{ space.block.startsWith('Bloco') ? space.block : `Bloco ${space.block}` }}</span>
    <span v-if="space.department" class="meta-sep">·</span>
    <span v-if="space.department">{{ space.department }}</span>
  </p>
</template>

<style scoped>
.room-popup__close {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  border: none;
  background: var(--muted);
  border-radius: 50%;
  width: 2rem;
  height: 2rem;
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  color: var(--muted-foreground);
  display: flex;
  align-items: center;
  justify-content: center;
}

.room-popup__title {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--foreground);
  margin: 0 2.5rem 0.25rem 0;
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.room-popup__number { font-size: 0.8rem; font-weight: 500; color: var(--muted-foreground); }
.room-popup__meta { color: var(--muted-foreground); font-size: 0.8rem; margin: 0 0 0.75rem; display: flex; flex-wrap: wrap; gap: 0.25rem; align-items: center; }
.meta-sep { color: var(--border); }
</style>
