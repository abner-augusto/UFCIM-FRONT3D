<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/services/api';
import type { OccupancyReport } from '@/types/report';
import ReportFilters from '@/components/reports/ReportFilters.vue';
import OccupancySummary from '@/components/reports/OccupancySummary.vue';
import LineChart from '@/components/reports/LineChart.vue';
import BarChart from '@/components/reports/BarChart.vue';
import TurnoPie from '@/components/reports/TurnoPie.vue';
import SpacesTable from '@/components/reports/SpacesTable.vue';

const auth = useAuthStore();

const report = ref<OccupancyReport | null>(null);
const loading = ref(true);
const errorMsg = ref<string | null>(null);

const currentFilters = ref<{
  startDate: string;
  endDate: string;
  campus: string;
  department: string;
} | null>(null);

function formatFilters(filters: { startDate: string; endDate: string; campus: string; department: string }) {
  const params: Record<string, string> = {};
  if (filters.startDate) params.startDate = filters.startDate;
  if (filters.endDate) params.endDate = filters.endDate;
  if (filters.campus) params.campus = filters.campus;
  if (filters.department) params.department = filters.department;
  return params;
}

async function loadReport(filters: { startDate: string; endDate: string; campus: string; department: string }) {
  loading.value = true;
  errorMsg.value = null;
  currentFilters.value = filters;
  try {
    report.value = await api.getOccupancyReport(auth.token, formatFilters(filters));
  } catch {
    errorMsg.value = 'Não foi possível carregar o relatório de ocupação.';
  } finally {
    loading.value = false;
  }
}

async function handleApply(filters: { startDate: string; endDate: string; campus: string; department: string }) {
  await loadReport(filters);
}

onMounted(async () => {
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  await loadReport({
    startDate: thirtyDaysAgo.toISOString().slice(0, 10),
    endDate: today.toISOString().slice(0, 10),
    campus: '',
    department: '',
  });
});
</script>

<template>
  <div class="reports-view">
    <h1>Relatório de Ocupação</h1>

    <ReportFilters @apply="handleApply" />

    <div v-if="loading" class="state-msg">Carregando relatório...</div>
    <div v-else-if="errorMsg" class="state-error">{{ errorMsg }}</div>
    <template v-else-if="report">
      <OccupancySummary :summary="report.summary" />

      <div class="charts-grid">
        <LineChart :data="report.daily" />
        <TurnoPie :turno-data="report.turnos" />
      </div>

      <BarChart
        :labels="report.spaces.map((s) => s.nome || s.numero)"
        :datasets="[
          {
            label: 'Reservas',
            data: report.spaces.map((s) => s.reservas),
            backgroundColor: '#1D9E75',
          },
        ]"
      />

      <SpacesTable :spaces="report.spaces" />
    </template>
  </div>
</template>

<style scoped>
.reports-view {
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

h1 {
  margin: 0;
  font-size: 1.3rem;
  color: #111;
}

.state-msg,
.state-error {
  text-align: center;
  padding: 2rem;
  color: #888;
  font-size: 0.95rem;
}

.state-error {
  color: #c0392b;
}

.charts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

@media (max-width: 640px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
}
</style>
