<script setup lang="ts">
import { computed } from 'vue';
import { Doughnut } from 'vue-chartjs';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import type { TurnoData } from '@/types/report';

ChartJS.register(ArcElement, Tooltip, Legend);

const props = defineProps<{
  turnoData: TurnoData[];
}>();

const COLORS = ['#1D9E75', '#F59E0B', '#3B82F6'];

const chartData = computed(() => ({
  labels: props.turnoData.map((t) => t.turno),
  datasets: [
    {
      data: props.turnoData.map((t) => t.reservas),
      backgroundColor: COLORS.slice(0, props.turnoData.length),
      borderWidth: 2,
      borderColor: 'white',
    },
  ],
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
    },
  },
};
</script>

<template>
  <div class="chart-container">
    <h3 class="chart-title">Reservas por Turno</h3>
    <div class="chart-wrapper">
      <Doughnut v-if="turnoData.length" :data="chartData" :options="chartOptions" />
      <p v-else class="chart-empty">Nenhum dado disponível.</p>
    </div>
  </div>
</template>

<style scoped>
.chart-container {
  background: white;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  padding: 1.25rem;
}

.chart-title {
  margin: 0 0 1rem;
  font-size: 1rem;
  font-weight: 600;
  color: #222;
}

.chart-wrapper {
  height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-empty {
  text-align: center;
  color: #aaa;
  padding: 4rem 0;
}
</style>
