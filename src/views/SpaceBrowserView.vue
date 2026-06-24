<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { campuses } from '@/data/campuses';
import { SPACE_TYPE_LABELS } from '@/types/space';
import { useSpaceBrowser } from '@/composables/useSpaceBrowser';
import { PERIOD_COLORS, type PinStatus } from '@/composables/usePinAvailability';
import SpaceCard from '@/components/SpaceCard.vue';
import AppDateField from '@/components/AppDateField.vue';
import type { PeriodKey } from '@/utils/period';
import { toLocalISODate } from '@/utils/date';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const campusId = route.params.campusId as string;
const campus = campuses.find((c) => c.id === campusId);
const campusFilter = campus?.shortName ?? campusId;

const {
  loading,
  error,
  searchQuery,
  blockFilter,
  typeFilter,
  statusFilter,
  selectedPeriod,
  periodAutoDetected,
  selectedDate,
  statusMap,
  availabilityLoaded,
  availabilityLoading,
  availableBlocks,
  availableTypes,
  groupedSpaces,
  filteredSpaces,
  loadSpaces,
  fetchAvailability,
  setPeriod,
} = useSpaceBrowser();

const expandedId = ref<string | null>(null);
const today = toLocalISODate();

const STATUS_OPTIONS: { value: PinStatus; label: string }[] = [
  { value: 'available', label: 'Disponível' },
  { value: 'partial', label: 'Parcial' },
  { value: 'reserved', label: 'Ocupado' },
  { value: 'blocked', label: 'Bloqueado' },
  { value: 'closed', label: 'Fechado' },
  { value: 'not_reservable', label: 'Indisponível' },
];

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id;
}

onMounted(async () => {
  await loadSpaces(auth.token, campusFilter);
  fetchAvailability(auth.token, selectedDate.value);
});

</script>

<template>
  <div class="space-browser">
    <div class="sticky-header">
      <!-- Header -->
      <div class="mb-5 flex items-center gap-4">
        <Button variant="ghost" class="text-primary px-0" @click="router.back()">← Voltar</Button>
        <h1 class="m-0 text-xl font-semibold">Buscar Espaços</h1>
      </div>

      <!-- Toolbar -->
      <div class="bg-muted/40 flex flex-col gap-2.5 rounded-xl p-3.5 shadow-[0_2px_8px_rgb(var(--shadow-color)/0.06)]">
        <div class="flex items-end gap-2 max-[480px]:flex-col max-[480px]:items-stretch">
          <Input
            v-model="searchQuery"
            type="text"
            class="h-11 flex-1 bg-background"
            placeholder="Buscar por nome ou número..."
            aria-label="Buscar por nome ou número"
          />
          <div class="flex shrink-0 flex-col gap-1">
            <Label class="text-muted-foreground text-[0.72rem] font-semibold uppercase" for="browser-date">Data</Label>
            <AppDateField id="browser-date" v-model="selectedDate" :min="today" aria-label="Selecionar data" />
          </div>
        </div>
        <div class="flex flex-wrap gap-1.5 [&>*]:max-[480px]:flex-[1_1_calc(50%-0.25rem)] [&>*]:max-[480px]:min-w-0">
          <NativeSelect
            class="flex-1"
            :model-value="blockFilter ?? ''"
            aria-label="Filtrar por bloco"
            @update:model-value="blockFilter = String($event) || null"
          >
            <NativeSelectOption value="">Todos os blocos</NativeSelectOption>
            <NativeSelectOption v-for="b in availableBlocks" :key="b" :value="b">{{ b }}</NativeSelectOption>
          </NativeSelect>
          <NativeSelect
            class="flex-1"
            :model-value="typeFilter ?? ''"
            aria-label="Filtrar por tipo"
            @update:model-value="typeFilter = String($event) || null"
          >
            <NativeSelectOption value="">Todos os tipos</NativeSelectOption>
            <NativeSelectOption v-for="t in availableTypes" :key="t" :value="t">
              {{ SPACE_TYPE_LABELS[t] ?? t }}
            </NativeSelectOption>
          </NativeSelect>
          <NativeSelect
            class="flex-1"
            :model-value="statusFilter ?? ''"
            aria-label="Filtrar por disponibilidade"
            @update:model-value="statusFilter = (String($event) || null) as PinStatus | null"
          >
            <NativeSelectOption value="">Disponibilidade</NativeSelectOption>
            <NativeSelectOption v-for="s in STATUS_OPTIONS" :key="s.value" :value="s.value">
              {{ s.label }}
            </NativeSelectOption>
          </NativeSelect>
        </div>
        <div class="flex flex-wrap items-center gap-3 max-[480px]:flex-col max-[480px]:items-stretch">
          <div class="flex items-center gap-1.5">
            <Label class="text-muted-foreground text-[0.72rem] font-semibold whitespace-nowrap uppercase" for="browser-period">
              Turno
              <span v-if="periodAutoDetected" class="bg-secondary text-secondary-foreground rounded px-1 py-px text-[0.62rem] font-medium">automático</span>
            </Label>
            <NativeSelect
              id="browser-period"
              :model-value="selectedPeriod"
              :disabled="availabilityLoading"
              @update:model-value="setPeriod(String($event) as PeriodKey)"
            >
              <NativeSelectOption value="morning">Manhã (07h–12h)</NativeSelectOption>
              <NativeSelectOption value="afternoon">Tarde (13h–18h)</NativeSelectOption>
              <NativeSelectOption value="evening">Noite (19h–22h)</NativeSelectOption>
            </NativeSelect>
          </div>
          <div class="flex gap-2.5">
            <span class="flex items-center gap-[3px] text-[0.72rem] text-muted-foreground">
              <span class="size-2 shrink-0 rounded-full" :style="{ background: PERIOD_COLORS.available }"></span>
              Disponível
            </span>
            <span class="flex items-center gap-[3px] text-[0.72rem] text-muted-foreground">
              <span class="size-2 shrink-0 rounded-full" :style="{ background: PERIOD_COLORS.partial }"></span>
              Parcial
            </span>
            <span class="flex items-center gap-[3px] text-[0.72rem] text-muted-foreground">
              <span class="size-2 shrink-0 rounded-full" :style="{ background: PERIOD_COLORS.reserved }"></span>
              Ocupado
            </span>
          </div>
          <span v-if="availabilityLoading" class="text-primary text-[0.72rem]">Carregando disponibilidade...</span>
        </div>
      </div>
    </div>

    <!-- States -->
    <div v-if="loading" class="flex flex-col gap-2" aria-busy="true" aria-label="Carregando espaços">
      <div
        v-for="n in 6"
        :key="n"
        class="border-border bg-card flex items-center gap-3 rounded-xl border px-4 py-[0.95rem]"
      >
        <Skeleton class="size-2.5 shrink-0 rounded-full" />
        <div class="min-w-0 flex-1">
          <!-- Line boxes track the real SpaceCard's h3/p (0.95rem & 0.8rem at
               line-height 1.5), nudged up slightly so the row reads as tall as
               the real card with its summary padding. -->
          <div class="flex h-[1.55rem] items-center">
            <Skeleton class="h-[0.75rem] rounded" :class="n % 2 ? 'w-40' : 'w-28'" />
          </div>
          <div class="mt-[0.15rem] flex h-[1.3rem] items-center">
            <Skeleton class="h-[0.6rem] w-56 max-w-[80%] rounded" />
          </div>
        </div>
        <Skeleton class="h-4 w-2 shrink-0 rounded" />
      </div>
    </div>
    <div v-else-if="error" class="text-destructive py-8 text-center text-sm">{{ error }}</div>
    <div v-else-if="filteredSpaces.length === 0" class="text-muted-foreground py-12 text-center text-sm">
      <p v-if="searchQuery || blockFilter || typeFilter || statusFilter">
        Nenhum espaço encontrado com os filtros selecionados.
      </p>
      <p v-else>Nenhum espaço cadastrado neste campus.</p>
    </div>

    <!-- Grouped list -->
    <div v-else class="flex flex-col gap-6">
      <section v-for="[block, spaces] in groupedSpaces" :key="block">
        <h2 class="mb-2 text-[0.78rem] font-bold tracking-[0.05em] text-muted-foreground uppercase">
          {{ block }}
          <span class="font-normal text-muted-foreground">({{ spaces.length }})</span>
        </h2>
        <div class="flex flex-col gap-2">
          <SpaceCard
            v-for="space in spaces"
            :key="space.id"
            :space="space"
            :status="statusMap.get(space.id)"
            :status-loaded="availabilityLoaded.has(space.id)"
            :expanded="expandedId === space.id"
            :selected-period="selectedPeriod"
            :selected-date="selectedDate"
            @toggle="toggleExpand(space.id)"
          />
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.space-browser {
  max-width: 680px;
  margin: 0 auto;
  padding: 0 1rem 3rem;
  overflow-x: hidden;
}

/* Sticky header wrapper */
.sticky-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--background);
  padding-top: 1.25rem;
  padding-bottom: 0.25rem;
  margin-bottom: 1rem;
}
</style>
