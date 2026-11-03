<script setup lang="ts">
import { computed } from 'vue';
import { BatteryFull, BatteryLow, BatteryMedium, WifiOff } from '@lucide/vue';
import type { SpaceAirQuality } from '@/types/air-quality';
import { AIR_LEVEL_LABELS, AIR_METRICS, airLevel, formatReadingAge, overallAirLevel } from '@/utils/air-quality';

const props = defineProps<{
  data: SpaceAirQuality | null;
  loading?: boolean;
}>();

const latest = computed(() => props.data?.latest ?? null);
const overall = computed(() => overallAirLevel(props.data?.stale ? null : latest.value));
const co2 = computed(() => AIR_METRICS[0]);
const secondary = computed(() => AIR_METRICS.slice(1));
const age = computed(() => (latest.value ? formatReadingAge(latest.value.measuredAt) : null));
const offline = computed(() => props.data?.device?.status === 'unreachable' || props.data?.device?.status === 'auth_failed');

const battery = computed(() => latest.value?.batteryPct ?? null);
const batteryIcon = computed(() => {
  const value = battery.value ?? 0;
  if (value <= 20) return BatteryLow;
  if (value <= 60) return BatteryMedium;
  return BatteryFull;
});

function display(key: (typeof AIR_METRICS)[number]['key']) {
  const metric = AIR_METRICS.find((m) => m.key === key)!;
  const value = latest.value?.[key];
  return value === null || value === undefined ? '—' : metric.format(value);
}
</script>

<template>
  <section v-if="data?.device" class="air" :class="{ 'air--stale': data.stale }" aria-labelledby="air-quality-title" data-testid="room-air-quality">
    <header class="air__head">
      <h3 id="air-quality-title" class="air__title">Qualidade do ar</h3>
      <span v-if="!data.stale" class="air__pill" :class="`air__pill--${overall}`">{{ AIR_LEVEL_LABELS[overall] }}</span>
      <span v-if="age" class="air__age">{{ age }}</span>
    </header>

    <p v-if="data.stale" class="air__notice" role="status">
      <WifiOff v-if="offline" :size="14" aria-hidden="true" />
      <template v-if="!latest">O sensor ainda não enviou leituras.</template>
      <template v-else-if="offline">Sensor sem conexão. Última leitura {{ age }}.</template>
      <template v-else>Sem leitura recente. Última leitura {{ age }}.</template>
    </p>

    <template v-if="latest">
      <div class="air__hero">
        <span class="air__dot" :class="`air__dot--${airLevel(co2.key, latest[co2.key])}`" aria-hidden="true" />
        <span class="air__hero-label">{{ co2.label }}</span>
        <span class="air__hero-value">{{ display(co2.key) }}</span>
        <span class="air__unit">{{ co2.unit }}</span>
      </div>

      <dl class="air__grid">
        <div v-for="metric in secondary" :key="metric.key" class="air__cell">
          <dt class="air__cell-label">
            <span class="air__dot air__dot--sm" :class="`air__dot--${airLevel(metric.key, latest[metric.key])}`" aria-hidden="true" />
            {{ metric.label }}
          </dt>
          <dd class="air__cell-value">
            {{ display(metric.key) }}<span class="air__unit">{{ metric.unit }}</span>
          </dd>
        </div>
      </dl>
    </template>

    <footer class="air__foot">
      <span>{{ data.device.label ?? data.device.model }}</span>
      <span v-if="battery !== null" class="air__battery" :title="`Bateria do sensor: ${battery}%`">
        <component :is="batteryIcon" :size="14" aria-hidden="true" />
        Bateria {{ battery }}%
      </span>
    </footer>
  </section>
</template>

<style scoped>
.air { margin: 0.5rem 0 0.75rem; padding: 0.75rem 0.85rem; border-radius: 12px; background: var(--muted); border: 1px solid var(--border); }
.air__head { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.55rem; }
.air__title { margin: 0; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted-foreground); }
.air__pill { font-size: 0.68rem; font-weight: 700; padding: 1px 8px; border-radius: 999px; }
.air__pill--good { background: var(--success-surface); color: var(--success); }
.air__pill--moderate { background: var(--warning-surface); color: var(--warning); }
.air__pill--poor { background: var(--danger-surface); color: var(--danger-fg); }
.air__pill--unknown { background: var(--background); color: var(--muted-foreground); }
.air__age { margin-left: auto; font-size: 0.72rem; color: var(--muted-foreground); }

.air__notice { display: flex; align-items: center; gap: 0.35rem; margin: 0 0 0.55rem; padding: 0.45rem 0.6rem; border-radius: 8px; font-size: 0.78rem; background: var(--warning-surface); color: var(--warning); }

.air__hero { display: flex; align-items: baseline; gap: 0.4rem; margin-bottom: 0.6rem; }
.air__hero-label { font-size: 0.85rem; font-weight: 600; color: var(--foreground); }
.air__hero-value { font-size: 1.6rem; font-weight: 700; line-height: 1; color: var(--foreground); font-variant-numeric: tabular-nums; }
.air__unit { margin-left: 0.2rem; font-size: 0.72rem; font-weight: 400; color: var(--muted-foreground); }

.air__dot { display: inline-block; width: 10px; height: 10px; border-radius: 999px; flex-shrink: 0; align-self: center; background: var(--border); }
.air__dot--sm { width: 7px; height: 7px; }
.air__dot--good { background: var(--success-solid, var(--success)); }
.air__dot--moderate { background: var(--warning); }
.air__dot--poor { background: var(--destructive); }

.air__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 0.5rem 0.75rem; margin: 0; }
.air__cell { min-width: 0; }
.air__cell-label { display: flex; align-items: center; gap: 0.3rem; font-size: 0.7rem; color: var(--muted-foreground); }
.air__cell-value { margin: 0.1rem 0 0; font-size: 0.92rem; font-weight: 600; color: var(--foreground); font-variant-numeric: tabular-nums; }

.air__foot { display: flex; justify-content: space-between; gap: 0.5rem; margin-top: 0.65rem; padding-top: 0.5rem; border-top: 1px solid var(--border); font-size: 0.72rem; color: var(--muted-foreground); }
.air__battery { display: inline-flex; align-items: center; gap: 0.25rem; }

.air--stale .air__hero, .air--stale .air__grid { opacity: 0.55; }
</style>
