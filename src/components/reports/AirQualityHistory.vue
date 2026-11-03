<script setup lang="ts">
/**
 * Air-quality history of the room report: one small line chart per metric, each
 * on its own axis, colored by level (green inside the acceptable band, yellow
 * through moderate, red at the peaks) with a dashed reference line. Chosen from
 * the report prototypes (branch prototype/air-quality-ui, variant A).
 */
import { computed, ref } from 'vue';
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  type Chart,
  type ChartDataset,
  type ChartOptions,
  type ScriptableContext,
  type TooltipItem,
} from 'chart.js';
import type { AirQualityHistoryPoint } from '@/types/air-quality';
import { AIR_LEVEL_LABELS, AIR_METRICS, airLevel, levelStops, type AirLevel, type AirMetricKey } from '@/utils/air-quality';
import { useDarkMode } from '@/composables/useDarkMode';
import { chartColors } from '@/lib/chartColors';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip);

const props = defineProps<{ points: AirQualityHistoryPoint[] }>();
const { isDark } = useDarkMode();
const showTable = ref(false);

const HOUR_MS = 60 * 60 * 1000;
const PANELS: Array<{ key: AirMetricKey; reference?: { value: number; label: string }; note?: string }> = [
  { key: 'co2Ppm', reference: { value: 1000, label: '1000 ppm · ANVISA RE 9/2003' } },
  { key: 'pm25Ugm3', reference: { value: 15, label: '15 µg/m³ · OMS 2021' } },
  { key: 'pm10Ugm3', reference: { value: 45, label: '45 µg/m³ · OMS 2021' } },
  { key: 'tvocMgm3', reference: { value: 0.3, label: '0,3 mg/m³ · UBA' } },
  { key: 'hchoMgm3', reference: { value: 0.1, label: '0,1 mg/m³ · OMS' } },
  { key: 'temperatureC', note: 'faixa de conforto 23–26 °C · ANVISA RE 9/2003' },
  { key: 'humidityPct', note: 'faixa de conforto 40–65 % · ANVISA RE 9/2003' },
];

/**
 * One slot per hour from the first to the last measured hour. Hours without a
 * sample stay null, so the line breaks instead of bridging a gap.
 */
const hourly = computed(() => {
  if (!props.points.length) return [];
  const byHour = new Map(props.points.map((p) => [new Date(p.measuredAt).getTime(), p]));
  const first = new Date(props.points[0].measuredAt).getTime();
  const last = new Date(props.points[props.points.length - 1].measuredAt).getTime();
  const slots: Array<{ at: number; point: AirQualityHistoryPoint | null }> = [];
  for (let at = first; at <= last; at += HOUR_MS) slots.push({ at, point: byHour.get(at) ?? null });
  return slots;
});

const labels = computed(() =>
  hourly.value.map(({ at }) =>
    `${new Date(at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', hour12: false, timeZone: 'America/Fortaleza' }).replace(', ', ' ')}h`,
  ),
);

const LEVEL_COLOR: Record<Exclude<AirLevel, 'unknown'>, 'levelGood' | 'levelModerate' | 'levelPoor'> = {
  good: 'levelGood',
  moderate: 'levelModerate',
  poor: 'levelPoor',
};

/** Vertical gradient for the line: each value height gets its level color. */
function levelGradient(chart: Chart, metric: AirMetricKey, fallback: string): CanvasGradient | string {
  const { ctx, chartArea, scales } = chart;
  const stops = levelStops(metric);
  if (!chartArea || !stops.length) return fallback;
  const c = chartColors();
  const y = scales.y;
  const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
  const span = chartArea.bottom - chartArea.top;
  for (const stop of stops) {
    const offset = (chartArea.bottom - y.getPixelForValue(stop.value)) / span;
    gradient.addColorStop(Math.min(1, Math.max(0, offset)), c[LEVEL_COLOR[stop.level]]);
  }
  return gradient;
}

function panelChart(panel: (typeof PANELS)[number]) {
  void isDark.value;
  const c = chartColors();
  const metric = AIR_METRICS.find((m) => m.key === panel.key)!;
  const values = hourly.value.map(({ point }) => point?.[panel.key] ?? null);

  const datasets: ChartDataset<'line', (number | null)[]>[] = [
    {
      label: metric.label,
      data: values,
      borderColor: (ctx: ScriptableContext<'line'>) => levelGradient(ctx.chart, panel.key, c.chart1),
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 5,
      pointHoverBorderColor: c.card,
      pointHoverBorderWidth: 2,
      pointHoverBackgroundColor: (ctx: ScriptableContext<'line'>) => {
        const level = airLevel(panel.key, ctx.raw as number | null);
        return level === 'unknown' ? c.chart1 : c[LEVEL_COLOR[level]];
      },
      tension: 0.25,
      spanGaps: false,
    },
  ];
  if (panel.reference) {
    datasets.push({
      label: panel.reference.label,
      data: values.map(() => panel.reference!.value),
      borderColor: c.mutedText,
      borderWidth: 1,
      borderDash: [4, 3],
      pointRadius: 0,
      pointHoverRadius: 0,
    });
  }

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: { display: false },
      tooltip: {
        filter: (item) => item.datasetIndex === 0,
        callbacks: {
          label: (item: TooltipItem<'line'>) => {
            const value = item.parsed.y;
            if (value === null) return `${metric.label}: sem dado`;
            const level = airLevel(panel.key, value);
            const suffix = level === 'unknown' ? '' : ` · ${AIR_LEVEL_LABELS[level]}`;
            return `${metric.label}: ${metric.format(value)} ${metric.unit}${suffix}`;
          },
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: c.mutedText, maxTicksLimit: 5, maxRotation: 0, font: { size: 10 } } },
      y: { grid: { color: c.grid }, ticks: { color: c.mutedText, maxTicksLimit: 4, font: { size: 10 } } },
    },
  };
  return { data: { labels: labels.value, datasets }, options };
}

const panels = computed(() =>
  PANELS.map((panel) => {
    const metric = AIR_METRICS.find((m) => m.key === panel.key)!;
    const values = props.points.map((p) => p[panel.key]).filter((v): v is number => v != null);
    const average = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
    const peak = values.length ? Math.max(...values) : null;
    return { ...panel, metric, average, peak, chart: panelChart(panel) };
  }),
);
</script>

<template>
  <div class="aqh">
    <div class="aqh__toolbar">
      <p class="aqh__legend">
        Médias por hora. Cor da linha:
        <span class="aqh__key aqh__key--good" aria-hidden="true" /> faixa aceitável
        <span class="aqh__key aqh__key--moderate" aria-hidden="true" /> moderado
        <span class="aqh__key aqh__key--poor" aria-hidden="true" /> acima do limite
        · tracejado = referência
      </p>
      <button type="button" class="aqh__toggle" :aria-pressed="showTable" @click="showTable = !showTable">
        {{ showTable ? 'Ver gráficos' : 'Ver tabela' }}
      </button>
    </div>

    <div v-if="!showTable" class="aqh__grid">
      <article v-for="panel in panels" :key="panel.key" class="aqh__panel" :class="{ 'aqh__panel--wide': panel.key === 'co2Ppm' }">
        <header class="aqh__head">
          <h3>{{ panel.metric.label }} <small>{{ panel.metric.unit }}</small></h3>
          <span v-if="panel.average !== null">
            média {{ panel.metric.format(panel.average) }} · pico {{ panel.metric.format(panel.peak!) }}
          </span>
        </header>
        <div class="aqh__chart" :class="{ 'aqh__chart--tall': panel.key === 'co2Ppm' }">
          <Line
            :data="panel.chart.data"
            :options="panel.chart.options"
            :aria-label="`${panel.metric.label} por hora no período`"
            role="img"
          />
        </div>
        <p v-if="panel.reference" class="aqh__ref">— — {{ panel.reference.label }}</p>
        <p v-else-if="panel.note" class="aqh__ref">{{ panel.note }}</p>
      </article>
    </div>

    <div v-else class="aqh__table-wrap">
      <table class="aqh__table">
        <caption class="sr-only">Médias por hora das medições de qualidade do ar</caption>
        <thead>
          <tr>
            <th scope="col">Hora</th>
            <th v-for="panel in panels" :key="panel.key" scope="col">{{ panel.metric.label }} ({{ panel.metric.unit }})</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="(slot, i) in hourly" :key="slot.at">
            <tr v-if="slot.point">
              <th scope="row">{{ labels[i] }}</th>
              <td v-for="panel in panels" :key="panel.key">
                {{ slot.point[panel.key] == null ? '—' : panel.metric.format(slot.point[panel.key] as number) }}
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.aqh__toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.6rem; }
.aqh__legend { display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem; margin: 0; font-size: 0.76rem; color: var(--muted-foreground); }
.aqh__key { display: inline-block; width: 14px; height: 3px; margin-left: 0.3rem; border-radius: 2px; }
.aqh__key--good { background: var(--success-solid, var(--success)); }
.aqh__key--moderate { background: var(--warning); }
.aqh__key--poor { background: var(--destructive); }
.aqh__toggle { min-height: 36px; padding: 0.35rem 0.8rem; border: 1px solid var(--border); border-radius: 999px; background: var(--card); color: var(--foreground); font-size: 0.8rem; cursor: pointer; }
.aqh__toggle:hover { background: var(--accent); }
.aqh__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 0.75rem; }
.aqh__panel { padding: 0.75rem 0.85rem; border: 1px solid var(--border); border-radius: 12px; background: var(--card); }
.aqh__panel--wide { grid-column: 1 / -1; }
.aqh__head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 0.25rem; margin-bottom: 0.25rem; }
.aqh__head h3 { margin: 0; font-size: 0.88rem; font-weight: 600; color: var(--foreground); }
.aqh__head small { font-weight: 400; color: var(--muted-foreground); }
.aqh__head span { font-size: 0.74rem; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
.aqh__chart { height: 120px; }
.aqh__chart--tall { height: 200px; }
.aqh__ref { margin: 0.25rem 0 0; font-size: 0.7rem; color: var(--muted-foreground); }
.aqh__table-wrap { max-height: 420px; overflow: auto; border: 1px solid var(--border); border-radius: 12px; background: var(--card); }
.aqh__table { width: 100%; border-collapse: collapse; font-size: 0.78rem; font-variant-numeric: tabular-nums; }
.aqh__table th, .aqh__table td { padding: 0.35rem 0.6rem; text-align: right; border-bottom: 1px solid var(--border); white-space: nowrap; }
.aqh__table th[scope='row'], .aqh__table thead th:first-child { text-align: left; font-weight: 500; }
.aqh__table thead th { position: sticky; top: 0; background: var(--card); color: var(--muted-foreground); font-weight: 600; }
</style>
