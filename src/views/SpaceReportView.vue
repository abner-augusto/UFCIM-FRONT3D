<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/services/api';
import type { SpaceReportData } from '@/types/report';
import type { Summary } from '@/types/report';
import SpaceReportHeader from '@/components/reports/SpaceReportHeader.vue';
import OccupancySummary from '@/components/reports/OccupancySummary.vue';
import DailyOccupancyChart from '@/components/reports/DailyOccupancyChart.vue';
import HourlyHeatmap from '@/components/reports/HourlyHeatmap.vue';
import ReservationTimeline from '@/components/reports/ReservationTimeline.vue';
import AppDateField from '@/components/AppDateField.vue';
import ChartCardSkeleton from '@/components/ChartCardSkeleton.vue';
import { Skeleton } from '@/components/ui/skeleton';
import { toLocalISODate } from '@/utils/date';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const spaceId = route.params.spaceId as string;
const report = ref<SpaceReportData | null>(null);
const loading = ref(false);
const errorMsg = ref<string | null>(null);

// Date range: default = last 30 days
const today = new Date();
const thirtyDaysAgo = new Date(today);
thirtyDaysAgo.setDate(today.getDate() - 29);

const startDate = ref(toLocalISODate(thirtyDaysAgo));
const endDate = ref(toLocalISODate(today));

// Preset chips
const presets = [
  { label: '7 dias', days: 7 },
  { label: '30 dias', days: 30 },
  { label: '90 dias', days: 90 },
];

function applyPreset(days: number) {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));
  startDate.value = toLocalISODate(start);
  endDate.value = toLocalISODate(end);
}

async function loadReport() {
  loading.value = true;
  errorMsg.value = null;
  try {
    report.value = await api.getSpaceReport(auth.token, spaceId, {
      startDate: startDate.value,
      endDate: endDate.value,
    });
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : 'Não foi possível carregar o relatório.';
  } finally {
    loading.value = false;
  }
}

onMounted(loadReport);
watch([startDate, endDate], loadReport);

const adaptedSummary = computed<Summary>(() => {
  if (!report.value) return { ocupacaoMedia: 0, totalReservas: 0, salasUsadas: 0 };
  return {
    ocupacaoMedia: report.value.summary.averageDailyOccupancy,
    totalReservas: report.value.summary.totalReservations,
    salasUsadas: 1,
  };
});

const todayStr = computed(() => toLocalISODate());
</script>

<template>
  <div class="space-report-view">
    <header class="view-header">
      <button class="back-btn" @click="router.back()">← Voltar</button>
      <h1>Relatório da Sala</h1>
    </header>

    <SpaceReportHeader v-if="report" :space="report.space" :range="report.range" />

    <section class="filter-row">
      <div class="presets">
        <button
          v-for="p in presets"
          :key="p.days"
          class="preset-chip"
          @click="applyPreset(p.days)"
        >
          {{ p.label }}
        </button>
      </div>
      <div class="custom-range">
        <AppDateField v-model="startDate" :max="endDate" aria-label="Data inicial do relatório" class="w-fit max-w-full px-3" />
        <span>até</span>
        <AppDateField v-model="endDate" :min="startDate" :max="todayStr" aria-label="Data final do relatório" class="w-fit max-w-full px-3" />
      </div>
    </section>

    <div v-if="loading" class="report-skeleton" role="status" aria-label="Carregando relatório">
      <div class="space-report-header" aria-hidden="true">
        <div class="header-info flex-1">
          <div class="flex h-8 items-center">
            <Skeleton class="h-5 w-52 rounded" />
          </div>
          <div class="mt-1 flex h-5 items-center">
            <Skeleton class="h-3 w-44 rounded" />
          </div>
        </div>
        <div class="header-range" aria-hidden="true">
          <Skeleton class="h-3 w-14 rounded" />
          <Skeleton class="h-3 w-32 rounded" />
          <Skeleton class="h-3 w-12 rounded" />
        </div>
      </div>

      <div class="summary-cards" aria-hidden="true">
        <div v-for="n in 3" :key="n" class="card">
          <Skeleton class="size-10 shrink-0 rounded-xl" />
          <div class="card-body">
            <Skeleton class="h-5 w-16 rounded" />
            <Skeleton class="mt-2 h-3 w-24 rounded" />
          </div>
        </div>
      </div>

      <section class="report-section">
        <ChartCardSkeleton title-width="w-32" />
      </section>

      <section class="report-section">
        <ChartCardSkeleton title-width="w-40" height-class="h-[260px]" />
      </section>

      <section class="report-section">
        <div class="border-border bg-card rounded-[12px] border p-5" aria-hidden="true">
          <div class="flex h-6 items-center">
            <Skeleton class="h-4 w-40 rounded" />
          </div>
          <div class="mt-4 space-y-3">
            <div v-for="n in 5" :key="n" class="flex gap-3">
              <Skeleton class="mt-1 h-3 w-20 shrink-0 rounded" />
              <Skeleton class="h-14 flex-1 rounded-xl" />
            </div>
          </div>
        </div>
      </section>
    </div>
    <p v-else-if="errorMsg" class="state-error">{{ errorMsg }}</p>

    <template v-else-if="report">
      <OccupancySummary :summary="adaptedSummary" />

      <section class="report-section">
        <h2>Ocupação por dia</h2>
        <DailyOccupancyChart :data="report.dailySeries" />
      </section>

      <section class="report-section">
        <h2>Horários mais procurados</h2>
        <HourlyHeatmap :data="report.hourlyAverage" />
      </section>

      <section class="report-section">
        <h2>Histórico de reservas</h2>
        <ReservationTimeline :reservations="report.reservations" :blockings="report.blockings" />
      </section>
    </template>
  </div>
</template>

<style scoped>
.space-report-view {
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.view-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.view-header h1 {
  margin: 0;
  font-size: 1.3rem;
  color: var(--foreground);
}

.back-btn {
  background: none;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.4rem 0.75rem;
  font-size: 0.85rem;
  color: var(--muted-foreground);
  cursor: pointer;
  transition: background 0.15s;
  min-height: var(--tap-min, 44px);
}

.back-btn:hover {
  background: var(--accent);
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.presets {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.preset-chip {
  padding: 0.35rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--card);
  color: var(--muted-foreground);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  min-height: 36px;
}

.preset-chip:hover {
  background: var(--accent);
  border-color: var(--primary);
  color: var(--primary);
}

.custom-range {
  display: flex;
  flex: 0 1 auto;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  color: var(--muted-foreground);
  min-width: 0;
}

@media (max-width: 520px) {
  .filter-row {
    align-items: stretch;
  }

  .custom-range {
    width: 100%;
  }
}

.state-msg,
.state-error {
  text-align: center;
  padding: 2rem;
  color: var(--muted-foreground);
  font-size: 0.95rem;
}

.state-error {
  color: var(--destructive);
}

.report-skeleton {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
}

.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.card-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.report-section h2 {
  margin: 0 0 0.75rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--foreground);
}
</style>
