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

const startDate = ref(thirtyDaysAgo.toISOString().split('T')[0]);
const endDate = ref(today.toISOString().split('T')[0]);

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
  startDate.value = start.toISOString().split('T')[0];
  endDate.value = end.toISOString().split('T')[0];
}

async function loadReport() {
  loading.value = true;
  errorMsg.value = null;
  try {
    report.value = await api.getSpaceReport(auth.token, spaceId, {
      startDate: startDate.value,
      endDate: endDate.value,
    });
  } catch (e: any) {
    errorMsg.value = e?.message ?? 'Não foi possível carregar o relatório.';
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

const todayStr = computed(() => new Date().toISOString().split('T')[0]);
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
        <input type="date" v-model="startDate" :max="endDate" />
        <span>até</span>
        <input type="date" v-model="endDate" :min="startDate" :max="todayStr" />
      </div>
    </section>

    <p v-if="loading" class="state-msg">Carregando relatório...</p>
    <p v-if="errorMsg" class="state-error">{{ errorMsg }}</p>

    <template v-if="report && !loading">
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
  color: #111;
}

.back-btn {
  background: none;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 0.4rem 0.75rem;
  font-size: 0.85rem;
  color: #555;
  cursor: pointer;
  transition: background 0.15s;
  min-height: var(--tap-min, 44px);
}

.back-btn:hover {
  background: #f5f5f5;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.presets {
  display: flex;
  gap: 0.4rem;
}

.preset-chip {
  padding: 0.35rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 999px;
  background: white;
  color: #555;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  min-height: 36px;
}

.preset-chip:hover {
  background: #f0f0f0;
  border-color: #1D9E75;
  color: #1D9E75;
}

.custom-range {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  color: #888;
}

.custom-range input[type="date"] {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 0.35rem 0.5rem;
  font-size: 0.82rem;
  color: #333;
  background: white;
  min-height: 36px;
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

.report-section h2 {
  margin: 0 0 0.75rem;
  font-size: 1rem;
  font-weight: 600;
  color: #333;
}
</style>
