<script setup lang="ts">
defineProps<{
  data: Array<{ hour: string; occupancyRate: number }>;
}>();

function opacity(rate: number): string {
  if (rate >= 75) return 'rgba(226, 75, 74, 0.85)';
  if (rate >= 50) return 'rgba(226, 75, 74, 0.55)';
  if (rate >= 25) return 'rgba(186, 117, 23, 0.55)';
  if (rate >= 10) return 'rgba(99, 153, 34, 0.5)';
  return 'rgba(99, 153, 34, 0.2)';
}

function color(rate: number): string {
  if (rate >= 75) return '#e24b4a';
  if (rate >= 50) return '#c0392b';
  if (rate >= 25) return '#ba7517';
  if (rate >= 10) return '#639922';
  return '#639922';
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
  background: white;
  border: 1px solid #e5e5e5;
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
  color: #999;
  margin-top: 4px;
  white-space: nowrap;
}

.heatmap-empty {
  text-align: center;
  color: #aaa;
  padding: 2rem 0;
}
</style>
