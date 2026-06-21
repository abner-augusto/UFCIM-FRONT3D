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
  <div class="mx-auto flex max-w-[960px] flex-col gap-6 px-4 py-6">
    <h1 class="m-0 text-xl font-semibold text-foreground">Relatório de Ocupação</h1>

    <ReportFilters @apply="handleApply" />

    <div v-if="loading" class="text-muted-foreground p-8 text-center text-[0.95rem]">Carregando relatório...</div>
    <div v-else-if="errorMsg" class="text-destructive p-8 text-center text-[0.95rem]">{{ errorMsg }}</div>
    <template v-else-if="report">
      <OccupancySummary :summary="report.summary" />

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
