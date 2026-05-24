<script setup lang="ts">
defineProps<{
  space: {
    id: string;
    name: string;
    number: string;
    block: string;
    type: string;
    capacity: number | null;
    department: string;
  };
  range: {
    startDate: string;
    endDate: string;
    days: number;
  };
}>();
</script>

<template>
  <div class="space-report-header">
    <div class="header-info">
      <h2 class="header-name">{{ space.name }} <span class="header-number">{{ space.number }}</span></h2>
      <p class="header-meta">
        <span>{{ space.block.startsWith('Bloco') ? space.block : `Bloco ${space.block}` }}</span>
        <span class="meta-sep">·</span>
        <span>{{ space.type }}</span>
        <span v-if="space.capacity != null" class="meta-sep">·</span>
        <span v-if="space.capacity != null">{{ space.capacity }} pessoas</span>
      </p>
    </div>
    <div class="header-range">
      <span class="range-label">Período</span>
      <span class="range-dates">{{ range.startDate }} — {{ range.endDate }}</span>
      <span class="range-days">({{ range.days }} dias)</span>
    </div>
  </div>
</template>

<style scoped>
.space-report-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  background: white;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  padding: 1.25rem;
}

.header-name {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: #111;
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
}

.header-number {
  font-size: 0.8rem;
  font-weight: 500;
  color: #999;
}

.header-meta {
  margin: 0.15rem 0 0;
  color: #888;
  font-size: 0.82rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  align-items: center;
}

.meta-sep {
  color: #ccc;
}

.header-range {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  background: #f5f5f5;
  border-radius: 8px;
  padding: 0.4rem 0.75rem;
}

.range-label {
  color: #999;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.7rem;
  letter-spacing: 0.04em;
}

.range-dates {
  color: #333;
  font-weight: 500;
}

.range-days {
  color: #aaa;
  font-size: 0.75rem;
}
</style>
