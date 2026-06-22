<script setup lang="ts">
defineProps<{
  data: Array<{ hour: string; occupancyRate: number }>;
}>();

// Inline DOM style bindings, so CSS tokens + color-mix resolve directly.
function opacity(rate: number): string {
  if (rate >= 75) return 'color-mix(in srgb, var(--avail-reserved) 85%, transparent)';
  if (rate >= 50) return 'color-mix(in srgb, var(--avail-reserved) 55%, transparent)';
  if (rate >= 25) return 'color-mix(in srgb, var(--avail-blocked) 55%, transparent)';
  if (rate >= 10) return 'color-mix(in srgb, var(--avail-free) 50%, transparent)';
  return 'color-mix(in srgb, var(--avail-free) 20%, transparent)';
}

function color(rate: number): string {
  if (rate >= 75) return 'var(--avail-reserved)';
  if (rate >= 50) return 'var(--color-danger)';
  if (rate >= 25) return 'var(--avail-blocked)';
  return 'var(--avail-free)';
}
</script>

<template>
  <div class="heatmap-container">
    <div v-if="data.length" class="heatmap-bars">
      <div
        v-for="h in data"
        :key="h.hour"
        class="heatbar"
        :title="`${h.hour}: ${h.occupancyRate.toFixed(1)}%`"
      >
        <div
          class="heatbar-fill"
          :style="{
            height: h.occupancyRate + '%',
            background: opacity(h.occupancyRate),
            borderColor: color(h.occupancyRate),
          }"
        />
        <span class="heatbar-label">{{ h.hour.slice(0, 2) }}h</span>
      </div>
    </div>
    <p v-else class="heatmap-empty">Nenhum dado de horário disponível.</p>
  </div>
</template>

<style scoped>
.heatmap-container {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1rem;
}

.heatmap-bars {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 160px;
}

.heatbar {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
  position: relative;
  min-width: 0;
}

.heatbar-fill {
  width: 100%;
  max-width: 32px;
  border-radius: 4px 4px 0 0;
  border: 1px solid;
  transition: height 0.2s ease;
  min-height: 4px;
}

.heatbar-label {
  font-size: 0.6rem;
  color: var(--muted-foreground);
  margin-top: 4px;
  white-space: nowrap;
}

.heatmap-empty {
  text-align: center;
  color: var(--muted-foreground);
  padding: 2rem 0;
}
</style>
