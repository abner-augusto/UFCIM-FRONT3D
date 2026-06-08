<script setup lang="ts">
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Filler,
  type TooltipItem,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Filler);

const props = defineProps<{
  data: Array<{ date: string; occupancyRate: number; reservations: number; blockings: number }>;
}>();

const chartData = computed(() => ({
  labels: props.data.map((d) => {
    // Short date format: DD/MM
    const parts = d.date.split('-');
    return `${parts[2]}/${parts[1]}`;
  }),
  datasets: [
    {
      label: 'Ocupação (%)',
      data: props.data.map((d) => d.occupancyRate),
      backgroundColor: props.data.map((d) =>
        d.occupancyRate >= 75 ? 'rgba(226, 75, 74, 0.75)' :
        d.occupancyRate >= 40 ? 'rgba(186, 117, 23, 0.7)' :
        'rgba(99, 153, 34, 0.65)'
      ),
      borderColor: props.data.map((d) =>
        d.occupancyRate >= 75 ? '#e24b4a' :
        d.occupancyRate >= 40 ? '#ba7517' :
        '#639922'
      ),
      borderWidth: 1,
      borderRadius: 3,
    },
  ],
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    tooltip: {
      callbacks: {
        afterBody: (items: TooltipItem<'bar'>[]) => {
          const idx = items[0].dataIndex;
          const d = props.data[idx];
          return [
            `Reservas: ${d.reservations}`,
            `Bloqueios: ${d.blockings}`,
          ];
        },
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      max: 100,
      title: {
        display: true,
        text: '%',
      },
      ticks: {
        stepSize: 20,
      },
    },
    x: {
      grid: {
        display: false,
      },
      ticks: {
        maxRotation: 45,
        font: {
          size: 10,
        },
      },
    },
  },
};
</script>

<template>
  <div class="chart-container">
    <Bar v-if="data.length" :data="chartData" :options="chartOptions" />
    <p v-else class="chart-empty">Nenhum dado disponível para o período.</p>
  </div>
</template>

<style scoped>
.chart-container {
  background: white;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  padding: 1rem;
  height: 300px;
  position: relative;
}

.chart-empty {
  text-align: center;
  color: #aaa;
  padding: 3rem 0;
}
</style>
