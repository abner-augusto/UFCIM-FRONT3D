<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer';
import AppDateField from '@/components/AppDateField.vue';
import type { ReservationStatusFilter } from '@/utils/my-reservations';

defineProps<{
  spaceOptions: { value: string; label: string }[];
  statusOptions: { value: ReservationStatusFilter; label: string }[];
  activeCount: number;
}>();

const emit = defineEmits<{ clear: [] }>();

// Two-way bindings straight to the parent's filter state — no local copy.
const open = defineModel<boolean>('open', { required: true });
const spaceId = defineModel<string | null>('spaceId', { required: true });
const from = defineModel<string | null>('from', { required: true });
const until = defineModel<string | null>('until', { required: true });
const status = defineModel<ReservationStatusFilter>('status', { required: true });

const isDesktop = useMediaQuery('(min-width: 768px)');
</script>

<template>
  <component :is="isDesktop ? Dialog : Drawer" :open="open" @update:open="open = $event">
    <!-- Container layout lives in utilities: the vaul drawer root does not get
         this component's scoped attribute. -->
    <component
      :is="isDesktop ? DialogContent : DrawerContent"
      class="my-reservations-filters z-[var(--z-modal)] rounded-[20px] shadow-[0_12px_40px_rgb(var(--shadow-color)/0.18)]"
      :class="isDesktop
        ? 'p-6 sm:max-w-[440px]'
        : 'mx-2 mb-[calc(0.5rem_+_var(--safe-bottom))] px-6 pt-2 pb-6'"
      overlay-class="supports-backdrop-filter:backdrop-blur-none"
    >
      <div class="filters__body">
        <component :is="isDesktop ? DialogTitle : DrawerTitle" class="filters__title">
          Filtros
        </component>
        <component :is="isDesktop ? DialogDescription : DrawerDescription" class="filters__description">
          Encontre suas reservas por espaço, período e situação.
        </component>

        <div class="filters__field">
          <Label class="filters__label" for="my-reservations-space">Espaço</Label>
          <NativeSelect
            id="my-reservations-space"
            class="h-11"
            :model-value="spaceId ?? ''"
            @update:model-value="spaceId = String($event) || null"
          >
            <NativeSelectOption value="">Todos os espaços</NativeSelectOption>
            <NativeSelectOption v-for="s in spaceOptions" :key="s.value" :value="s.value">
              {{ s.label }}
            </NativeSelectOption>
          </NativeSelect>
        </div>

        <fieldset class="filters__field filters__fieldset">
          <legend class="filters__label">Período</legend>
          <div class="filters__range">
            <div class="filters__range-item">
              <Label class="filters__sublabel" for="my-reservations-from">De</Label>
              <AppDateField
                id="my-reservations-from"
                :model-value="from ?? ''"
                :max="until ?? undefined"
                aria-label="Data inicial"
                @update:model-value="from = $event || null"
              />
            </div>
            <div class="filters__range-item">
              <Label class="filters__sublabel" for="my-reservations-until">Até</Label>
              <AppDateField
                id="my-reservations-until"
                :model-value="until ?? ''"
                :min="from ?? undefined"
                aria-label="Data final"
                @update:model-value="until = $event || null"
              />
            </div>
          </div>
        </fieldset>

        <div class="filters__field">
          <Label class="filters__label" for="my-reservations-status">Situação</Label>
          <NativeSelect
            id="my-reservations-status"
            class="h-11"
            :model-value="status"
            @update:model-value="status = String($event) as ReservationStatusFilter"
          >
            <NativeSelectOption v-for="s in statusOptions" :key="s.value" :value="s.value">
              {{ s.label }}
            </NativeSelectOption>
          </NativeSelect>
        </div>

        <div class="filters__actions">
          <Button type="button" variant="ghost" class="h-11" :disabled="activeCount === 0" @click="emit('clear')">
            Limpar filtros
          </Button>
          <Button type="button" class="h-11" @click="open = false">
            Ver reservas
          </Button>
        </div>
      </div>
    </component>
  </component>
</template>

<!-- Non-scoped: targets the vaul drawer root (see the comment above). -->
<style>
.my-reservations-filters[data-vaul-drawer]::after { content: none !important; }
</style>

<style scoped>
.filters__body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.filters__title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--foreground);
  margin: 0;
}

.filters__description {
  color: var(--muted-foreground);
  font-size: 0.85rem;
  margin: -0.75rem 0 0.25rem;
}

.filters__field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

/* Full-width selects; the primitive's wrapper sizes to its content. */
.filters__field :deep([data-slot='native-select-wrapper']) {
  width: 100%;
}

.filters__fieldset {
  border: 0;
  margin: 0;
  padding: 0;
  min-width: 0;
}

.filters__label {
  color: var(--muted-foreground);
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0;
}

.filters__range {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filters__range-item {
  display: grid;
  grid-template-columns: 2.25rem 1fr;
  align-items: center;
  gap: 0.5rem;
}

.filters__sublabel {
  color: var(--muted-foreground);
  font-size: 0.85rem;
  font-weight: 500;
}

.filters__actions {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
</style>
