<script setup lang="ts">
import type { Campus } from '@/data/campuses';

defineProps<{
  campus: Campus;
}>();

defineEmits<{
  select: [campusId: string];
}>();
</script>

<template>
  <div
    class="campus-card"
    :class="{ 'campus-card--disabled': !campus.active }"
    @click="campus.active && $emit('select', campus.id)"
    role="button"
    :tabindex="campus.active ? 0 : -1"
    :aria-disabled="!campus.active"
  >
    <div class="campus-card__header">
      <h3 class="campus-card__name">{{ campus.shortName }}</h3>
      <span v-if="!campus.active" class="campus-card__badge">Em breve</span>
    </div>
    <p class="campus-card__description">{{ campus.description }}</p>
    <p class="campus-card__location">
      {{ campus.city }}{{ campus.neighborhood ? ` — ${campus.neighborhood}` : '' }}
    </p>
    <div v-if="campus.active && campus.buildings.length" class="campus-card__buildings">
      <span v-for="b in campus.buildings" :key="b" class="campus-card__building-tag">{{ b }}</span>
    </div>
  </div>
</template>

<style scoped>
.campus-card {
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  padding: 1.25rem;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
  background: white;
}
.campus-card:hover:not(.campus-card--disabled) {
  border-color: #1D9E75;
  box-shadow: 0 2px 8px rgba(29, 158, 117, 0.1);
}
.campus-card--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.campus-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}
.campus-card__name {
  margin: 0;
  font-size: 1.1rem;
}
.campus-card__badge {
  font-size: 0.75rem;
  background: #f0f0f0;
  color: #888;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
}
.campus-card__description {
  font-size: 0.85rem;
  color: #666;
  margin: 0 0 0.5rem;
}
.campus-card__location {
  font-size: 0.8rem;
  color: #999;
  margin: 0;
}
.campus-card__buildings {
  margin-top: 0.75rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.campus-card__building-tag {
  font-size: 0.75rem;
  background: #e8f5f0;
  color: #1D9E75;
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
}
</style>
