<script setup lang="ts">
/**
 * Air quality of the room: a one-line verdict (CO₂ + comfort) that expands into
 * each pollutant placed on its reference scale. Chosen from the popup prototypes
 * (branch prototype/air-quality-ui): B's compact line, opening into C's bands.
 */
import { computed, ref, useId } from 'vue';
import { BatteryFull, BatteryLow, BatteryMedium, ChevronDown, CircleAlert, CircleCheck, OctagonAlert, WifiOff } from '@lucide/vue';
import type { SpaceAirQuality } from '@/types/air-quality';
import {
  AIR_BANDS,
  AIR_BAND_ROWS,
  AIR_LEVEL_LABELS,
  AIR_METRICS,
  airLevel,
  bandPercent,
  formatReadingAge,
  overallAirLevel,
  type AirMetricKey,
} from '@/utils/air-quality';

const props = defineProps<{
  data: SpaceAirQuality | null;
  loading?: boolean;
}>();

const expanded = ref(false);
const panelId = useId();
const latest = computed(() => props.data?.latest ?? null);
const offline = computed(() => ['unreachable', 'auth_failed'].includes(props.data?.device?.status ?? ''));
const level = computed(() => (props.data?.stale ? 'unknown' : overallAirLevel(latest.value)));
const age = computed(() => (latest.value ? formatReadingAge(latest.value.measuredAt) : null));

const verdict = computed(() => {
  if (!latest.value) return 'Aguardando leituras';
  if (props.data?.stale) return offline.value ? 'Sensor sem conexão' : 'Sem leitura recente';
  return `Ar ${AIR_LEVEL_LABELS[level.value].toLowerCase()}`;
});
const verdictIcon = computed(() => {
  if (props.data?.stale || !latest.value) return WifiOff;
  return { good: CircleCheck, moderate: CircleAlert, poor: OctagonAlert, unknown: WifiOff }[level.value];
});

const metric = (key: AirMetricKey) => AIR_METRICS.find((m) => m.key === key)!;
function format(key: AirMetricKey) {
  const value = latest.value?.[key];
  if (value === null || value === undefined) return '—';
  const m = metric(key);
  return `${m.format(value)} ${m.unit}`;
}

const rows = computed(() =>
  AIR_BAND_ROWS.map(({ key, scaleMax }) => {
    const [good, moderate] = AIR_BANDS[key]!;
    const value = latest.value?.[key] ?? null;
    return {
      key,
      label: metric(key).label,
      text: format(key),
      level: airLevel(key, value),
      goodWidth: bandPercent(good, scaleMax),
      moderateWidth: bandPercent(moderate, scaleMax) - bandPercent(good, scaleMax),
      marker: value === null ? null : bandPercent(value, scaleMax),
    };
  }),
);

const battery = computed(() => latest.value?.batteryPct ?? null);
const batteryIcon = computed(() => {
  const value = battery.value ?? 0;
  if (value <= 20) return BatteryLow;
  if (value <= 60) return BatteryMedium;
  return BatteryFull;
});
</script>

<template>
  <section
    v-if="data?.device"
    class="air"
    :class="[`air--${level}`, { 'air--stale': data.stale }]"
    aria-label="Qualidade do ar"
    data-testid="room-air-quality"
  >
    <button
      type="button"
      class="air__summary"
      :aria-expanded="expanded"
      :aria-controls="panelId"
      @click="expanded = !expanded"
    >
      <component :is="verdictIcon" :size="16" class="air__icon" aria-hidden="true" />
      <span class="air__verdict">{{ verdict }}</span>
      <template v-if="latest">
        <span class="air__sep" aria-hidden="true">·</span>
        <span class="air__co2">CO₂ <strong>{{ format('co2Ppm') }}</strong></span>
        <span class="air__comfort">{{ format('temperatureC') }} · {{ format('humidityPct') }}</span>
      </template>
      <ChevronDown :size="16" class="air__chevron" :class="{ 'air__chevron--open': expanded }" aria-hidden="true" />
    </button>

    <div v-show="expanded" :id="panelId" class="air__panel">
      <p v-if="data.stale && latest" class="air__notice" role="status">
        Última leitura {{ age }}. Os valores abaixo podem não refletir a sala agora.
      </p>

      <ul v-if="latest" class="air__rows">
        <li v-for="row in rows" :key="row.key" class="air__row">
          <span class="air__label">{{ row.label }}</span>
          <span class="air__track" role="img" :aria-label="`${row.label}: ${row.text}, ${AIR_LEVEL_LABELS[row.level].toLowerCase()}`">
            <span class="air__zone air__zone--good" :style="{ width: `${row.goodWidth}%` }" />
            <span v-if="row.moderateWidth > 0" class="air__zone air__zone--moderate" :style="{ width: `${row.moderateWidth}%` }" />
            <span class="air__zone air__zone--poor" />
            <span v-if="row.marker !== null" class="air__marker" :class="`air__marker--${row.level}`" :style="{ left: `${row.marker}%` }" />
          </span>
          <span class="air__value">{{ row.text }}</span>
        </li>
      </ul>
      <p v-if="latest" class="air__legend" aria-hidden="true">
        <span class="air__key air__key--good" />Bom
        <span class="air__key air__key--moderate" />Moderado
        <span class="air__key air__key--poor" />Ruim
      </p>
      <p v-else class="air__notice" role="status">O sensor ainda não enviou leituras.</p>

      <footer class="air__foot">
        <span>
          {{ data.device.label ?? data.device.model }}
          <template v-if="age"> · {{ age }}</template>
          <template v-if="latest?.pm1Ugm3 != null"> · PM1 {{ format('pm1Ugm3') }}</template>
        </span>
        <span v-if="battery !== null" class="air__battery" :title="`Bateria do sensor: ${battery}%`">
          <component :is="batteryIcon" :size="14" aria-hidden="true" />
          Bateria {{ battery }}%
        </span>
      </footer>
    </div>
  </section>
</template>

<style scoped>
.air { margin: 0.5rem 0 0.75rem; border-radius: 10px; border: 1px solid var(--border); background: var(--card); }

.air__summary { display: flex; align-items: center; gap: 0.45rem; width: 100%; min-height: 44px; padding: 0.5rem 0.75rem; border: 0; border-radius: 10px; background: none; cursor: pointer; text-align: left; font-size: 0.85rem; color: var(--foreground); }
.air__summary:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
.air__icon { flex-shrink: 0; color: var(--muted-foreground); }
.air--good .air__icon { color: var(--success); }
.air--moderate .air__icon { color: var(--warning); }
.air--poor .air__icon { color: var(--danger-fg); }
.air__verdict { font-weight: 700; white-space: nowrap; }
.air__sep { color: var(--muted-foreground); }
.air__co2 { white-space: nowrap; }
.air__co2 strong { font-variant-numeric: tabular-nums; }
.air__comfort { margin-left: auto; color: var(--muted-foreground); white-space: nowrap; font-variant-numeric: tabular-nums; }
.air__chevron { flex-shrink: 0; color: var(--muted-foreground); transition: transform 0.2s var(--ease-out-expo, ease); }
.air__chevron--open { transform: rotate(180deg); }
.air__summary:has(.air__comfort) .air__chevron { margin-left: 0; }
.air__summary:not(:has(.air__comfort)) .air__chevron { margin-left: auto; }

.air__panel { padding: 0.15rem 0.75rem 0.65rem; border-top: 1px solid var(--border); }
.air__notice { margin: 0.55rem 0 0; padding: 0.45rem 0.6rem; border-radius: 8px; font-size: 0.78rem; background: var(--warning-surface); color: var(--warning); }

.air__rows { display: grid; gap: 0.45rem; margin: 0.6rem 0 0; padding: 0; list-style: none; }
.air__row { display: grid; grid-template-columns: 4.9rem minmax(0, 1fr) 5.7rem; align-items: center; gap: 0.6rem; font-size: 0.78rem; }
.air__label { color: var(--muted-foreground); }
.air__value { text-align: right; font-weight: 600; color: var(--foreground); font-variant-numeric: tabular-nums; }
.air__track { position: relative; display: flex; gap: 2px; height: 8px; }
.air__zone { height: 100%; }
.air__zone--good { background: var(--success-surface); border-radius: 4px 0 0 4px; }
.air__zone--moderate { background: var(--warning-surface); }
.air__zone--poor { flex: 1; background: var(--danger-surface); border-radius: 0 4px 4px 0; }
.air__marker { position: absolute; top: 50%; width: 12px; height: 12px; border: 2px solid var(--card); border-radius: 999px; transform: translate(-50%, -50%); background: var(--foreground); }
.air__marker--good { background: var(--success-solid, var(--success)); }
.air__marker--moderate { background: var(--warning); }
.air__marker--poor { background: var(--destructive); }

.air__legend { display: flex; align-items: center; gap: 0.3rem; margin: 0.45rem 0 0; font-size: 0.68rem; color: var(--muted-foreground); }
.air__key { display: inline-block; width: 10px; height: 6px; margin-left: 0.45rem; border-radius: 2px; }
.air__key:first-child { margin-left: 0; }
.air__key--good { background: var(--success-surface); }
.air__key--moderate { background: var(--warning-surface); }
.air__key--poor { background: var(--danger-surface); }

.air__foot { display: flex; justify-content: space-between; gap: 0.5rem; margin-top: 0.6rem; padding-top: 0.5rem; border-top: 1px solid var(--border); font-size: 0.72rem; color: var(--muted-foreground); }
.air__battery { display: inline-flex; align-items: center; gap: 0.25rem; white-space: nowrap; }

.air--stale .air__rows { opacity: 0.55; }
</style>
