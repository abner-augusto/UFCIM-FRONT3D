<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { SlidersHorizontalIcon, XIcon } from '@lucide/vue';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/services/api';
import type { Reservation } from '@/types/reservation';
import type {
  DepartmentReservationCreatorOption,
  DepartmentReservationSpaceOption,
  DepartmentReservationsPagination,
  UnitReservationsFilters,
} from '@/types/unit-reservations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ListItemSkeleton from '@/components/ListItemSkeleton.vue';
import UnitReservationCard from '@/components/UnitReservationCard.vue';
import UnitReservationsFiltersSheet from '@/components/UnitReservationsFiltersSheet.vue';
import {
  DEFAULT_UNIT_RESERVATIONS_FILTERS,
  UNIT_RESERVATIONS_PAGE_SIZE,
  UNIT_STATUS_FILTER_OPTIONS,
  buildUnitFilterChips,
  buildUnitReservationsQuery,
  clearUnitFilter,
  countUnitActiveFilters,
  unitCreatorOptions,
  unitSpaceOptions,
  type UnitFilterKey,
} from '@/utils/unit-reservations';

const auth = useAuthStore();

const reservations = ref<Reservation[]>([]);
const spaces = ref<DepartmentReservationSpaceOption[]>([]);
const creators = ref<DepartmentReservationCreatorOption[]>([]);
const pagination = ref<DepartmentReservationsPagination>({
  page: 1,
  limit: UNIT_RESERVATIONS_PAGE_SIZE,
  total: 0,
  totalPages: 1,
});
const loading = ref(true);
const errorMsg = ref<string | null>(null);
const expandedId = ref<string | null>(null);
const filtersOpen = ref(false);
const filters = reactive<UnitReservationsFilters>({ ...DEFAULT_UNIT_RESERVATIONS_FILTERS });

let requestSeq = 0;

const spaceOptions = computed(() => unitSpaceOptions(spaces.value));
const creatorOptions = computed(() => unitCreatorOptions(creators.value));
const activeFilterCount = computed(() => countUnitActiveFilters(filters));
const activeChips = computed(() => buildUnitFilterChips(filters, spaceOptions.value, creatorOptions.value));

async function loadReservations(page = 1) {
  const seq = ++requestSeq;
  loading.value = true;
  errorMsg.value = null;

  try {
    const res = await api.getDepartmentReservations(auth.token, buildUnitReservationsQuery(filters, page));
    if (seq !== requestSeq) return;
    reservations.value = res.data;
    pagination.value = res.pagination;
    spaces.value = res.spaces;
    creators.value = res.creators;
    expandedId.value = null;
  } catch {
    if (seq === requestSeq) {
      errorMsg.value = 'Não foi possível carregar as reservas da unidade.';
    }
  } finally {
    if (seq === requestSeq) loading.value = false;
  }
}

function handleClearFilter(key: UnitFilterKey) {
  clearUnitFilter(filters, key);
}

function clearAllFilters() {
  Object.assign(filters, DEFAULT_UNIT_RESERVATIONS_FILTERS);
}

function showCanceled() {
  filters.status = 'canceled';
}

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id;
}

onMounted(() => {
  void loadReservations(1);
});

watch(
  () => [filters.spaceId, filters.from, filters.until, filters.status, filters.createdBy],
  () => {
    void loadReservations(1);
  },
);
</script>

<template>
  <div class="unit-reservations-view">
    <div class="view-header">
      <h1>Reservas da unidade</h1>
      <Button
        v-if="!errorMsg"
        variant="outline"
        class="h-11 shrink-0 gap-2"
        data-testid="open-unit-reservation-filters"
        aria-label="Abrir filtros"
        @click="filtersOpen = true"
      >
        <SlidersHorizontalIcon class="size-4" />
        Filtros
        <Badge v-if="activeFilterCount" variant="secondary" class="ml-0.5">{{ activeFilterCount }}</Badge>
      </Button>
    </div>

    <div v-if="!loading && activeChips.length" class="mb-4 flex flex-wrap gap-1.5" aria-label="Filtros ativos">
      <Badge
        v-for="chip in activeChips"
        :key="chip.key"
        variant="secondary"
        class="h-7 gap-1 pr-1 pl-2.5 text-[0.78rem]"
        data-testid="unit-active-filter-chip"
      >
        {{ chip.label }}
        <button
          type="button"
          class="hover:bg-foreground/10 focus-visible:ring-ring -mr-0.5 inline-flex size-5 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none"
          :aria-label="`Remover filtro: ${chip.label}`"
          @click="handleClearFilter(chip.key)"
        >
          <XIcon class="size-3.5" />
        </button>
      </Badge>
    </div>

    <ListItemSkeleton v-if="loading" :count="4" label="Carregando reservas da unidade" />
    <div v-else-if="errorMsg" class="state-error">{{ errorMsg }}</div>
    <div v-else-if="reservations.length === 0" class="state-empty">
      <template v-if="activeFilterCount === 0">
        <p>Não há reservas ativas na unidade no momento.</p>
        <Button variant="ghost" class="mt-2 h-11 text-primary" @click="showCanceled">Ver canceladas</Button>
      </template>
      <template v-else>
        <p>Nenhuma reserva encontrada com os filtros selecionados.</p>
        <Button variant="ghost" class="mt-2 h-11 text-primary" @click="clearAllFilters">Limpar filtros</Button>
      </template>
    </div>

    <template v-else>
      <p class="results-summary" data-testid="unit-reservations-count">
        {{ pagination.total }} {{ pagination.total === 1 ? 'reserva encontrada' : 'reservas encontradas' }}
      </p>

      <ul class="reservation-list">
        <UnitReservationCard
          v-for="r in reservations"
          :key="r.id"
          :reservation="r"
          :expanded="expandedId === r.id"
          @toggle="toggleExpand(r.id)"
        />
      </ul>

      <nav v-if="pagination.totalPages > 1" class="pagination-bar" aria-label="Paginação">
        <Button
          variant="outline"
          class="h-11"
          :disabled="pagination.page <= 1"
          @click="loadReservations(pagination.page - 1)"
        >
          Anterior
        </Button>
        <span class="pagination-bar__info">
          Página {{ pagination.page }} de {{ pagination.totalPages }}
        </span>
        <Button
          variant="outline"
          class="h-11"
          :disabled="pagination.page >= pagination.totalPages"
          @click="loadReservations(pagination.page + 1)"
        >
          Próxima
        </Button>
      </nav>
    </template>

    <UnitReservationsFiltersSheet
      v-model:open="filtersOpen"
      v-model:space-id="filters.spaceId"
      v-model:from="filters.from"
      v-model:until="filters.until"
      v-model:status="filters.status"
      v-model:created-by="filters.createdBy"
      :space-options="spaceOptions"
      :creator-options="creatorOptions"
      :status-options="UNIT_STATUS_FILTER_OPTIONS"
      :active-count="activeFilterCount"
      @clear="clearAllFilters"
    />
  </div>
</template>

<style scoped>
.unit-reservations-view { max-width: 640px; margin: 0 auto; padding: 1.5rem 1rem; }
.view-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
  min-height: 2.75rem;
}
h1 { margin: 0; font-size: 1.3rem; }
.results-summary { margin: 0 0 0.75rem; font-size: 0.85rem; color: var(--muted-foreground); }
.reservation-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.75rem; }
.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 1.25rem;
}
.pagination-bar__info { font-size: 0.85rem; color: var(--muted-foreground); }
.state-error { color: var(--destructive); font-size: 0.9rem; }
.state-empty { color: var(--muted-foreground); font-size: 0.9rem; text-align: center; padding: 3rem 0; }
</style>
