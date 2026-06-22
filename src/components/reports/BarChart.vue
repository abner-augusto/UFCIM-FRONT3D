<script setup lang="ts">
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';
import { useDarkMode } from '@/composables/useDarkMode';
import { chartColors } from '@/lib/chartColors';
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

const { isDark } = useDarkMode();

const chartData = computed(() => {
  void isDark.value; // re-resolve tokens on theme change
  const c = chartColors();
  return {
    labels: props.labels,
    datasets: props.datasets.map((ds) => ({
      ...ds,
      backgroundColor: ds.backgroundColor || c.chart1,
      borderColor: ds.borderColor || c.chart1,
      borderWidth: 1,
      borderRadius: 4,
    })),
  };
});

const chartOptions = computed(() => {
  void isDark.value;
  const c = chartColors();
  return {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: c.grid },
        ticks: { color: c.mutedText },
      },
      x: {
        grid: { display: false },
        ticks: { color: c.mutedText },
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: c.foreground },
      },
    },
  };
});
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
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.25rem;
}

.chart-title {
  margin: 0 0 1rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--foreground);
}

.chart-wrapper {
  height: 280px;
}

.chart-empty {
  text-align: center;
  color: var(--muted-foreground);
  padding: 4rem 0;
}
</style>
