<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer';
import AppDateField from '@/components/AppDateField.vue';
import type { SelectOption } from '@/utils/unit-reservations';

defineProps<{
  actorOptions: SelectOption[];
  actionTypeOptions: SelectOption[];
  activeCount: number;
}>();

const emit = defineEmits<{ clear: [] }>();

const open = defineModel<boolean>('open', { required: true });
const userId = defineModel<string | null>('userId', { required: true });
const actionType = defineModel<string | null>('actionType', { required: true });
const from = defineModel<string | null>('from', { required: true });
const until = defineModel<string | null>('until', { required: true });

const isDesktop = useMediaQuery('(min-width: 768px)');
</script>

<template>
  <component :is="isDesktop ? Dialog : Drawer" :open="open" @update:open="open = $event">
    <component
      :is="isDesktop ? DialogContent : DrawerContent"
      class="action-history-filters z-[var(--z-modal)] rounded-[20px] shadow-[0_12px_40px_rgb(var(--shadow-color)/0.18)]"
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
          Filtre o histórico de ações por pessoa, tipo de ação e período.
        </component>

        <div class="filters__field">
          <Label class="filters__label" for="action-history-actor">Pessoa</Label>
          <NativeSelect
            id="action-history-actor"
            class="h-11"
            :model-value="userId ?? ''"
            @update:model-value="userId = String($event) || null"
          >
            <NativeSelectOption value="">Qualquer pessoa</NativeSelectOption>
            <NativeSelectOption v-for="a in actorOptions" :key="a.value" :value="a.value">
              {{ a.label }}
            </NativeSelectOption>
          </NativeSelect>
        </div>

        <div class="filters__field">
          <Label class="filters__label" for="action-history-type">Tipo de ação</Label>
          <NativeSelect
            id="action-history-type"
            class="h-11"
            :model-value="actionType ?? ''"
            @update:model-value="actionType = String($event) || null"
          >
            <NativeSelectOption value="">Todas as ações</NativeSelectOption>
            <NativeSelectOption v-for="t in actionTypeOptions" :key="t.value" :value="t.value">
              {{ t.label }}
            </NativeSelectOption>
          </NativeSelect>
        </div>

        <fieldset class="filters__field filters__fieldset">
          <legend class="filters__label">Período</legend>
          <div class="filters__range">
            <div class="filters__range-item">
              <Label id="action-history-from-label" class="filters__sublabel" for="action-history-from">De</Label>
              <AppDateField
                id="action-history-from"
                label-id="action-history-from-label"
                :model-value="from ?? ''"
                :max="until ?? undefined"
                @update:model-value="from = $event || null"
              />
            </div>
            <div class="filters__range-item">
              <Label id="action-history-until-label" class="filters__sublabel" for="action-history-until">Até</Label>
              <AppDateField
                id="action-history-until"
                label-id="action-history-until-label"
                :model-value="until ?? ''"
                :min="from ?? undefined"
                @update:model-value="until = $event || null"
              />
            </div>
          </div>
        </fieldset>

        <div class="filters__actions">
          <Button type="button" variant="ghost" class="h-11" :disabled="activeCount === 0" @click="emit('clear')">
            Limpar filtros
          </Button>
          <Button type="button" class="h-11" @click="open = false">
            Ver ações
          </Button>
        </div>
      </div>
    </component>
  </component>
</template>

<style>
.action-history-filters[data-vaul-drawer]::after { content: none !important; }
</style>

<style scoped>
.filters__body { display: flex; flex-direction: column; gap: 1rem; }
.filters__title { font-size: 1.1rem; font-weight: 700; color: var(--foreground); margin: 0; }
.filters__description { color: var(--muted-foreground); font-size: 0.85rem; margin: -0.75rem 0 0.25rem; }
.filters__field { display: flex; flex-direction: column; gap: 0.35rem; }
.filters__field :deep([data-slot='native-select-wrapper']) { width: 100%; }
.filters__fieldset { border: 0; margin: 0; padding: 0; min-width: 0; }
.filters__label {
  color: var(--muted-foreground);
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0;
}
.filters__range { display: flex; flex-direction: column; gap: 0.5rem; }
.filters__range-item { display: grid; grid-template-columns: 2.25rem 1fr; align-items: center; gap: 0.5rem; }
.filters__sublabel { color: var(--muted-foreground); font-size: 0.85rem; font-weight: 500; }
.filters__actions { display: flex; justify-content: space-between; gap: 0.5rem; margin-top: 0.5rem; }
</style>
