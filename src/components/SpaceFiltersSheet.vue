<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer';
import { SPACE_TYPE_LABELS } from '@/types/space';
import type { PinStatus } from '@/composables/usePinAvailability';
import type { PeriodKey } from '@/utils/period';

const props = defineProps<{
  blocks: string[];
  types: string[];
  statusOptions: { value: PinStatus; label: string }[];
  periodOptions: { value: PeriodKey; label: string }[];
  period: PeriodKey;
  periodAutoDetected: boolean;
  availabilityLoading: boolean;
  activeCount: number;
}>();

const emit = defineEmits<{
  'update:period': [period: PeriodKey];
  clear: [];
}>();

// Two-way filter bindings that write straight back to the composable refs the
// parent owns — this sheet does not duplicate any filter state.
const open = defineModel<boolean>('open', { required: true });
const blockFilter = defineModel<string | null>('blockFilter', { required: true });
const typeFilter = defineModel<string | null>('typeFilter', { required: true });
const statusFilter = defineModel<PinStatus | null>('statusFilter', { required: true });

const isDesktop = ref(window.matchMedia('(min-width: 768px)').matches);
const mediaQuery = window.matchMedia('(min-width: 768px)');

function handleMediaChange(event: MediaQueryListEvent | MediaQueryList) {
  isDesktop.value = event.matches;
}

onMounted(() => {
  mediaQuery.addEventListener('change', handleMediaChange);
});

onUnmounted(() => {
  mediaQuery.removeEventListener('change', handleMediaChange);
});

const hasActive = computed(() => props.activeCount > 0);
</script>

<template>
  <component :is="isDesktop ? Dialog : Drawer" :open="open" @update:open="open = $event">
    <component
      :is="isDesktop ? DialogContent : DrawerContent"
      class="space-filters z-[var(--z-modal)]"
      :class="isDesktop ? '' : 'mx-2 mb-[calc(0.5rem_+_var(--safe-bottom))]'"
      overlay-class="supports-backdrop-filter:backdrop-blur-none"
    >
      <div class="space-filters__body">
        <component :is="isDesktop ? DialogTitle : DrawerTitle" class="space-filters__title">
          Filtros
        </component>
        <component :is="isDesktop ? DialogDescription : DrawerDescription" class="space-filters__description">
          Refine os espaços por bloco, tipo, disponibilidade e turno.
        </component>

        <div class="space-filters__field">
          <Label class="space-filters__label" for="filters-block">Bloco</Label>
          <NativeSelect
            id="filters-block"
            :model-value="blockFilter ?? ''"
            aria-label="Filtrar por bloco"
            @update:model-value="blockFilter = String($event) || null"
          >
            <NativeSelectOption value="">Todos os blocos</NativeSelectOption>
            <NativeSelectOption v-for="b in blocks" :key="b" :value="b">{{ b }}</NativeSelectOption>
          </NativeSelect>
        </div>

        <div class="space-filters__field">
          <Label class="space-filters__label" for="filters-type">Tipo</Label>
          <NativeSelect
            id="filters-type"
            :model-value="typeFilter ?? ''"
            aria-label="Filtrar por tipo"
            @update:model-value="typeFilter = String($event) || null"
          >
            <NativeSelectOption value="">Todos os tipos</NativeSelectOption>
            <NativeSelectOption v-for="t in types" :key="t" :value="t">
              {{ SPACE_TYPE_LABELS[t] ?? t }}
            </NativeSelectOption>
          </NativeSelect>
        </div>

        <div class="space-filters__field">
          <Label class="space-filters__label" for="filters-status">Disponibilidade</Label>
          <NativeSelect
            id="filters-status"
            :model-value="statusFilter ?? ''"
            aria-label="Filtrar por disponibilidade"
            @update:model-value="statusFilter = (String($event) || null) as PinStatus | null"
          >
            <NativeSelectOption value="">Qualquer disponibilidade</NativeSelectOption>
            <NativeSelectOption v-for="s in statusOptions" :key="s.value" :value="s.value">
              {{ s.label }}
            </NativeSelectOption>
          </NativeSelect>
        </div>

        <div class="space-filters__field">
          <Label class="space-filters__label" for="filters-period">
            Turno
            <span v-if="periodAutoDetected" class="space-filters__auto">automático</span>
          </Label>
          <NativeSelect
            id="filters-period"
            :model-value="period"
            :disabled="availabilityLoading"
            aria-label="Filtrar por turno"
            @update:model-value="emit('update:period', String($event) as PeriodKey)"
          >
            <NativeSelectOption v-for="p in periodOptions" :key="p.value" :value="p.value">
              {{ p.label }}
            </NativeSelectOption>
          </NativeSelect>
        </div>

        <div class="space-filters__actions">
          <Button
            type="button"
            variant="ghost"
            class="space-filters__clear"
            :disabled="!hasActive"
            @click="emit('clear')"
          >
            Limpar filtros
          </Button>
          <Button type="button" class="space-filters__apply" @click="open = false">
            Ver resultados
          </Button>
        </div>
      </div>
    </component>
  </component>
</template>

<!-- Non-scoped: targets the vaul drawer root, which does not receive this component's scoped attr. -->
<style>
.space-filters[data-vaul-drawer]::after { content: none !important; }
</style>

<style scoped>
.space-filters {
  background: var(--popover);
  border-radius: 20px;
  padding: 1.5rem;
  width: 100%;
  max-width: 440px;
  box-shadow: 0 12px 40px rgb(var(--shadow-color) / 0.18);
  position: relative;
  padding-bottom: calc(1.5rem + var(--safe-bottom, 0px));
}

.space-filters[data-state="open"] {
  animation: space-filters-in 0.3s var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1)) both;
}

.space-filters[data-state="closed"] {
  animation: space-filters-out 0.18s ease-in both;
}

.space-filters::before {
  content: '';
  display: block;
  width: 36px;
  height: 4px;
  background: var(--border);
  border-radius: 2px;
  margin: 0 auto 1rem;
}

.space-filters__body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.space-filters__title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--foreground);
  margin: 0;
}

.space-filters__description {
  color: var(--muted-foreground);
  font-size: 0.85rem;
  margin: -0.75rem 0 0.25rem;
}

.space-filters__field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.space-filters__label {
  color: var(--muted-foreground);
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.space-filters__auto {
  background: var(--secondary);
  color: var(--secondary-foreground);
  border-radius: 4px;
  padding: 1px 4px;
  font-size: 0.62rem;
  font-weight: 500;
  text-transform: none;
}

.space-filters__actions {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

@media (max-width: 480px) {
  .space-filters {
    max-width: none;
    padding: 0 1.5rem 1.5rem;
    padding-bottom: calc(1.5rem + var(--safe-bottom, 0px));
  }
}

@media (prefers-reduced-motion: reduce) {
  .space-filters[data-state="open"],
  .space-filters[data-state="closed"] {
    animation: none !important;
  }
}

@keyframes space-filters-in {
  from { opacity: 0; transform: translate(-50%, 28px) scale(0.96); }
  to { opacity: 1; transform: translate(-50%, 0) scale(1); }
}

@keyframes space-filters-out {
  from { opacity: 1; transform: translate(-50%, 0) scale(1); }
  to { opacity: 0; transform: translate(-50%, 12px) scale(0.97); }
}
</style>
