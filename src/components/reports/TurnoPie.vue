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
import { useDarkMode } from '@/composables/useDarkMode';
import { chartColors } from '@/lib/chartColors';

ChartJS.register(ArcElement, Tooltip, Legend);

const props = defineProps<{
  turnoData: TurnoData[];
}>();

const { isDark } = useDarkMode();

const chartData = computed(() => {
  void isDark.value;
  const c = chartColors();
  const palette = [c.chart1, c.chart3, c.chart2];
  return {
    labels: props.turnoData.map((t) => t.turno),
    datasets: [
      {
        data: props.turnoData.map((t) => t.reservas),
        backgroundColor: palette.slice(0, props.turnoData.length),
        borderWidth: 2,
        borderColor: c.card,
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
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: c.foreground },
      },
    },
  };
});
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
  height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-empty {
  text-align: center;
  color: var(--muted-foreground);
  padding: 4rem 0;
}
</style>
