<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/services/api';
import type { OccupancyReport } from '@/types/report';
import { useDarkMode } from '@/composables/useDarkMode';
import { chartColors } from '@/lib/chartColors';
import ReportFilters from '@/components/reports/ReportFilters.vue';
import OccupancySummary from '@/components/reports/OccupancySummary.vue';
import LineChart from '@/components/reports/LineChart.vue';
import BarChart from '@/components/reports/BarChart.vue';
import TurnoPie from '@/components/reports/TurnoPie.vue';
import SpacesTable from '@/components/reports/SpacesTable.vue';
import ChartCardSkeleton from '@/components/ChartCardSkeleton.vue';
import { Skeleton } from '@/components/ui/skeleton';

const auth = useAuthStore();
const { isDark } = useDarkMode();

const report = ref<OccupancyReport | null>(null);
const loading = ref(true);
const errorMsg = ref<string | null>(null);

const currentFilters = ref<{
  startDate: string;
  endDate: string;
  campus: string;
  department: string;
} | null>(null);

const reservationsDataset = computed(() => {
  void isDark.value;
  const colors = chartColors();
  return [
    {
      label: 'Reservas',
      data: report.value?.spaces.map((s) => s.reservas) ?? [],
      backgroundColor: colors.chart1,
    },
  ];
});

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

    <div v-if="loading" class="flex flex-col gap-4" role="status" aria-label="Carregando relatório">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div
          v-for="n in 3"
          :key="n"
          class="border-border bg-card flex items-center gap-4 rounded-[12px] border p-5"
        >
          <Skeleton class="size-10 shrink-0 rounded-xl" />
          <div class="min-w-0 flex-1">
            <div class="flex h-9 items-center">
              <Skeleton class="h-5 rounded" :class="n === 1 ? 'w-20' : 'w-16'" />
            </div>
            <div class="mt-1 flex h-5 items-center">
              <Skeleton class="h-3 w-24 rounded" />
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ChartCardSkeleton title-width="w-32" />
        <ChartCardSkeleton title-width="w-36" height-class="h-[260px]" />
      </div>

      <ChartCardSkeleton title-width="w-36" />

      <div class="border-border bg-card rounded-[12px] border p-5" aria-hidden="true">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex h-6 items-center">
            <Skeleton class="h-4 w-40 rounded" />
          </div>
          <div class="flex items-center gap-2">
            <Skeleton class="h-3 w-16 rounded" />
            <Skeleton class="h-9 w-36 rounded-lg" />
          </div>
        </div>
        <div class="mt-4 overflow-hidden rounded-lg border border-border">
          <div class="grid grid-cols-7 gap-0 border-b border-border bg-muted/40 px-3 py-3">
            <Skeleton v-for="n in 7" :key="`head-${n}`" class="h-3 w-12 rounded" />
          </div>
          <div v-for="row in 5" :key="row" class="grid grid-cols-7 gap-0 border-b border-border px-3 py-3 last:border-b-0">
            <Skeleton
              v-for="col in 7"
              :key="`${row}-${col}`"
              class="h-3 rounded"
              :class="col === 1 ? 'w-20' : 'w-10'"
            />
          </div>
        </div>
      </div>
    </div>
    <div v-else-if="errorMsg" class="text-destructive p-8 text-center text-[0.95rem]">{{ errorMsg }}</div>
    <template v-else-if="report">
      <OccupancySummary :summary="report.summary" />

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <LineChart :data="report.daily" />
        <TurnoPie :turno-data="report.turnos" />
      </div>

      <BarChart
        :labels="report.spaces.map((s) => s.nome || s.numero)"
        :datasets="reservationsDataset"
      />

      <SpacesTable :spaces="report.spaces" />
    </template>
  </div>
</template>
