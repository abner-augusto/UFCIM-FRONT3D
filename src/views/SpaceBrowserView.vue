<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { campuses } from '@/data/campuses';
import { SPACE_TYPE_LABELS } from '@/types/space';
import { useSpaceBrowser } from '@/composables/useSpaceBrowser';
import { PERIOD_COLORS, type PinStatus } from '@/composables/usePinAvailability';
import SpaceCard from '@/components/SpaceCard.vue';
import type { PeriodKey } from '@/utils/period';

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
const today = new Date().toISOString().split('T')[0];

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

// Period change triggers re-derivation (handled inside composable via watch)
// but we also close any expanded card since status may have changed
watch(selectedPeriod, () => {
  expandedId.value = null;
});
</script>

<template>
  <div class="space-browser">
    <div class="sticky-header">
      <!-- Header -->
      <div class="view-header">
        <button class="back-btn" @click="router.back()">← Voltar</button>
        <h1>Buscar Espaços</h1>
      </div>

      <!-- Toolbar -->
      <div class="toolbar">
      <div class="toolbar__top-row">
        <input
          type="text"
          class="toolbar__search"
          placeholder="Buscar por nome ou número..."
          v-model="searchQuery"
        />
        <div class="date-picker-wrap">
          <label class="date-label">Data</label>
          <input
            type="date"
            class="toolbar__date"
            v-model="selectedDate"
            :min="today"
          />
        </div>
      </div>
      <div class="toolbar__filters">
        <select v-model="blockFilter" class="toolbar__select">
          <option :value="null">Todos os blocos</option>
          <option v-for="b in availableBlocks" :key="b" :value="b">{{ b }}</option>
        </select>
        <select v-model="typeFilter" class="toolbar__select">
          <option :value="null">Todos os tipos</option>
          <option v-for="t in availableTypes" :key="t" :value="t">
            {{ SPACE_TYPE_LABELS[t] ?? t }}
          </option>
        </select>
        <select v-model="statusFilter" class="toolbar__select">
          <option :value="null">Disponibilidade</option>
          <option v-for="s in STATUS_OPTIONS" :key="s.value" :value="s.value">
            {{ s.label }}
          </option>
        </select>
      </div>
      <div class="toolbar__period-row">
        <div class="period-control">
          <label class="period-label">
            Turno
            <span v-if="periodAutoDetected" class="auto-tag">automático</span>
          </label>
          <select
            class="toolbar__select"
            :value="selectedPeriod"
            :disabled="availabilityLoading"
            @change="setPeriod(($event.target as HTMLSelectElement).value as PeriodKey)"
          >
            <option value="morning">Manhã (07h–12h)</option>
            <option value="afternoon">Tarde (13h–18h)</option>
            <option value="evening">Noite (19h–22h)</option>
          </select>
        </div>
        <div class="legend">
          <span class="legend-item">
            <span class="legend-dot" :style="{ background: PERIOD_COLORS.available }"></span>
            Disponível
          </span>
          <span class="legend-item">
            <span class="legend-dot" :style="{ background: PERIOD_COLORS.partial }"></span>
            Parcial
          </span>
          <span class="legend-item">
            <span class="legend-dot" :style="{ background: PERIOD_COLORS.reserved }"></span>
            Ocupado
          </span>
        </div>
        <span v-if="availabilityLoading" class="loading-hint">Carregando disponibilidade...</span>
      </div>
    </div>
    </div>

    <!-- States -->
    <div v-if="loading" class="state-msg">Carregando espaços...</div>
    <div v-else-if="error" class="state-error">{{ error }}</div>
    <div v-else-if="filteredSpaces.length === 0" class="state-empty">
      <p v-if="searchQuery || blockFilter || typeFilter || statusFilter">
        Nenhum espaço encontrado com os filtros selecionados.
      </p>
      <p v-else>Nenhum espaço cadastrado neste campus.</p>
    </div>

    <!-- Grouped list -->
    <div v-else class="space-groups">
      <section v-for="[block, spaces] in groupedSpaces" :key="block" class="space-group">
        <h2 class="group-heading">
          {{ block }}
          <span class="group-count">({{ spaces.length }})</span>
        </h2>
        <div class="group-cards">
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
}

/* Sticky header wrapper */
.sticky-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #fff;
  padding-top: 1.25rem;
  padding-bottom: 0.25rem;
  margin-bottom: 1rem;
}

/* Header */
.view-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
}
.view-header h1 {
  margin: 0;
  font-size: 1.3rem;
}
.back-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #1D9E75;
  font-size: 0.95rem;
  padding: 0;
}

/* Toolbar */
.toolbar {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-bottom: 0;
  background: #f9fafb;
  border-radius: 12px;
  padding: 0.85rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.toolbar__top-row {
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
}
.toolbar__search {
  flex: 1;
  padding: 0.6rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 0.9rem;
  box-sizing: border-box;
  background: white;
}
.toolbar__search:focus {
  outline: none;
  border-color: #1D9E75;
}
.date-picker-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  flex-shrink: 0;
}
.date-label {
  font-size: 0.72rem;
  color: #666;
  font-weight: 600;
  text-transform: uppercase;
}
.toolbar__date {
  padding: 0.5rem 0.6rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 0.85rem;
  background: white;
  cursor: pointer;
  color: #333;
}
.toolbar__date:focus {
  outline: none;
  border-color: #1D9E75;
}
.toolbar__filters {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.toolbar__select {
  flex: 1;
  min-width: 0;
  padding: 0.45rem 0.5rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.82rem;
  background: white;
  cursor: pointer;
}

/* Period row */
.toolbar__period-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.period-control {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.period-label {
  font-size: 0.72rem;
  color: #666;
  font-weight: 600;
  text-transform: uppercase;
  white-space: nowrap;
}
.auto-tag {
  font-size: 0.62rem;
  background: #e8f5f0;
  color: #1D9E75;
  border-radius: 4px;
  padding: 1px 4px;
  font-weight: 500;
}

.legend {
  display: flex;
  gap: 0.6rem;
}
.legend-item {
  font-size: 0.72rem;
  color: #555;
  display: flex;
  align-items: center;
  gap: 3px;
}
.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.loading-hint {
  font-size: 0.72rem;
  color: #1D9E75;
}

/* States */
.state-msg { color: #888; font-size: 0.9rem; padding: 2rem 0; text-align: center; }
.state-error { color: #c0392b; font-size: 0.9rem; padding: 2rem 0; text-align: center; }
.state-empty { color: #888; font-size: 0.9rem; text-align: center; padding: 3rem 0; }

/* Groups */
.space-groups {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.group-heading {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #999;
  margin: 0 0 0.5rem;
}
.group-count {
  font-weight: 400;
  color: #bbb;
}
.group-cards {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
</style>
