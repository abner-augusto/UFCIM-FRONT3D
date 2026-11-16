<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { SlidersHorizontalIcon, XIcon } from '@lucide/vue';
import { useAuthStore } from '@/stores/auth';
import { fetchActionHistory } from '@/services/action-history';
import type {
  ActionHistoryActorOption,
  ActionHistoryFilters,
  ActionHistoryItem,
  ActionHistoryPagination,
} from '@/types/action-history';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ListItemSkeleton from '@/components/ListItemSkeleton.vue';
import ActionHistoryCard from '@/components/ActionHistoryCard.vue';
import ActionHistoryFiltersSheet from '@/components/ActionHistoryFiltersSheet.vue';
import {
  ACTION_HISTORY_PAGE_SIZE,
  ACTION_TYPE_FILTER_OPTIONS,
  DEFAULT_ACTION_HISTORY_FILTERS,
  actionActorOptions,
  buildActionHistoryFilterChips,
  buildActionHistoryQuery,
  clearActionHistoryFilter,
  countActionHistoryActiveFilters,
  type ActionHistoryFilterKey,
} from '@/utils/action-history';

const auth = useAuthStore();

const entries = ref<ActionHistoryItem[]>([]);
const actors = ref<ActionHistoryActorOption[]>([]);
const pagination = ref<ActionHistoryPagination>({
  page: 1,
  limit: ACTION_HISTORY_PAGE_SIZE,
  total: 0,
  totalPages: 1,
});
const loading = ref(true);
const errorMsg = ref<string | null>(null);
const filtersOpen = ref(false);
const filters = reactive<ActionHistoryFilters>({ ...DEFAULT_ACTION_HISTORY_FILTERS });

let requestSeq = 0;

const actorOptions = computed(() => actionActorOptions(actors.value));
const activeFilterCount = computed(() => countActionHistoryActiveFilters(filters));
const activeChips = computed(() => buildActionHistoryFilterChips(filters, actorOptions.value));

async function loadLogs(page = 1) {
  const seq = ++requestSeq;
  loading.value = true;
  errorMsg.value = null;

  try {
    const res = await fetchActionHistory(auth.token, buildActionHistoryQuery(filters, page));
    if (seq !== requestSeq) return;
    entries.value = res.data;
    pagination.value = res.pagination;
    actors.value = res.actors;
  } catch {
    if (seq === requestSeq) {
      errorMsg.value = 'Não foi possível carregar o histórico de ações.';
    }
  } finally {
    if (seq === requestSeq) loading.value = false;
  }
}

function handleClearFilter(key: ActionHistoryFilterKey) {
  clearActionHistoryFilter(filters, key);
}

function clearAllFilters() {
  Object.assign(filters, DEFAULT_ACTION_HISTORY_FILTERS);
}

onMounted(() => {
  void loadLogs(1);
});

watch(
  () => [filters.userId, filters.actionType, filters.from, filters.until],
  () => {
    void loadLogs(1);
  },
);
</script>

<template>
  <div class="action-history-view">
    <div class="view-header">
      <h1>Histórico de ações</h1>
      <Button
        v-if="!errorMsg"
        variant="outline"
        class="h-11 shrink-0 gap-2"
        data-testid="open-action-history-filters"
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
        data-testid="action-history-active-filter-chip"
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

    <ListItemSkeleton v-if="loading" :count="4" label="Carregando histórico de ações" />
    <div v-else-if="errorMsg" class="state-error">{{ errorMsg }}</div>
    <div v-else-if="entries.length === 0" class="state-empty">
      <template v-if="activeFilterCount === 0">
        <p>Nenhuma ação de reserva ou bloqueio registrada na unidade ainda.</p>
      </template>
      <template v-else>
        <p>Nenhuma ação encontrada com os filtros selecionados.</p>
        <Button variant="ghost" class="mt-2 h-11 text-primary" @click="clearAllFilters">Limpar filtros</Button>
      </template>
    </div>

    <template v-else>
      <p class="results-summary" data-testid="action-history-count">
        {{ pagination.total }} {{ pagination.total === 1 ? 'ação encontrada' : 'ações encontradas' }}
      </p>

      <ul class="action-list">
        <ActionHistoryCard v-for="entry in entries" :key="entry.id" :entry="entry" />
      </ul>

      <nav v-if="pagination.totalPages > 1" class="pagination-bar" aria-label="Paginação">
        <Button
          variant="outline"
          class="h-11"
          :disabled="pagination.page <= 1"
          @click="loadLogs(pagination.page - 1)"
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
          @click="loadLogs(pagination.page + 1)"
        >
          Próxima
        </Button>
      </nav>
    </template>

    <ActionHistoryFiltersSheet
      v-model:open="filtersOpen"
      v-model:user-id="filters.userId"
      v-model:action-type="filters.actionType"
      v-model:from="filters.from"
      v-model:until="filters.until"
      :actor-options="actorOptions"
      :action-type-options="ACTION_TYPE_FILTER_OPTIONS"
      :active-count="activeFilterCount"
      @clear="clearAllFilters"
    />
  </div>
</template>

<style scoped>
.action-history-view { max-width: 640px; margin: 0 auto; padding: 1.5rem 1rem; }
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
.action-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.75rem; }
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
