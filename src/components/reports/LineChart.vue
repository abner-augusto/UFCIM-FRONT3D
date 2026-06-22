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
import { useDarkMode } from '@/composables/useDarkMode';
import { chartColors } from '@/lib/chartColors';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const props = defineProps<{
  data: DailyPoint[];
}>();

const { isDark } = useDarkMode();

const chartData = computed(() => {
  void isDark.value;
  const c = chartColors();
  return {
    labels: props.data.map((d) => {
      const date = new Date(d.date + 'T12:00:00');
      return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' });
    }),
    datasets: [
      {
        label: 'Ocupação (%)',
        data: props.data.map((d) => d.ocupacao),
        borderColor: c.chart1,
        backgroundColor: `color-mix(in srgb, ${c.chart1} 12%, transparent)`,
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: c.chart1,
      },
      {
        label: 'Reservas',
        data: props.data.map((d) => d.reservas),
        borderColor: c.chart2,
        backgroundColor: `color-mix(in srgb, ${c.chart2} 12%, transparent)`,
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: c.chart2,
      },
    ],
  };
});

const chartOptions = computed(() => {
  void isDark.value;
  const c = chartColors();
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
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
    <h3 class="chart-title">Evolução Diária</h3>
    <div class="chart-wrapper">
      <Line v-if="data.length" :data="chartData" :options="chartOptions" />
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
