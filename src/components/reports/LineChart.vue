<script setup lang="ts">
import { computed } from 'vue';
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import type { DailyPoint } from '@/types/report';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const props = defineProps<{
  data: DailyPoint[];
}>();

const chartData = computed(() => ({
  labels: props.data.map((d) => {
    const date = new Date(d.date + 'T12:00:00');
    return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' });
  }),
  datasets: [
    {
      label: 'Ocupação (%)',
      data: props.data.map((d) => d.ocupacao),
      borderColor: '#1D9E75',
      backgroundColor: 'rgba(29, 158, 117, 0.1)',
      fill: true,
      tension: 0.3,
      pointRadius: 3,
      pointBackgroundColor: '#1D9E75',
    },
    {
      label: 'Reservas',
      data: props.data.map((d) => d.reservas),
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.3,
      pointRadius: 3,
      pointBackgroundColor: '#3B82F6',
    },
  ],
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    intersect: false,
    mode: 'index' as const,
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: { color: '#f0f0f0' },
    },
    x: {
      grid: { display: false },
    },
  },
  plugins: {
    legend: {
      position: 'top' as const,
    },
  },
};
</script>

<template>
  <div class="chart-container">
    <h3 class="chart-title">Evolução Diária</h3>
    <div class="chart-wrapper">
      <Line v-if="data.length" :data="chartData" :options="chartOptions" />
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
  height: 280px;
}

.chart-empty {
  text-align: center;
  color: #aaa;
  padding: 4rem 0;
}
</style>
