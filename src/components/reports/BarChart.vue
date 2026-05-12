<script setup lang="ts">
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const props = defineProps<{
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }>;
}>();

const chartData = computed(() => ({
  labels: props.labels,
  datasets: props.datasets.map((ds) => ({
    ...ds,
    backgroundColor: ds.backgroundColor || '#1D9E75',
    borderColor: ds.borderColor || '#1D9E75',
    borderWidth: 1,
    borderRadius: 4,
  })),
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
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
    <h3 class="chart-title">Reservas por Sala</h3>
    <div class="chart-wrapper">
      <Bar v-if="labels.length" :data="chartData" :options="chartOptions" />
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
