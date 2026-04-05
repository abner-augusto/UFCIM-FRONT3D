<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { campuses } from '@/data/campuses';

const route = useRoute();
const router = useRouter();

const campusId = route.params.campusId as string;
const campus = computed(() => campuses.find(c => c.id === campusId));

function handleSelect(deptId: string) {
  // Only IAUD maps to the viewer — future departments can use their own route
  router.push({ name: 'viewer', params: { campusId } });
}
</script>

<template>
  <div class="dept-select">
    <div class="dept-select__header">
      <button class="back-btn" @click="router.back()">← Voltar</button>
      <div class="dept-select__title">
        <h1>{{ campus?.name }}</h1>
        <p>Selecione a unidade para visualizar e reservar espaços</p>
      </div>
    </div>

    <div v-if="!campus" class="state-error">Campus não encontrado.</div>

    <div v-else class="dept-select__grid">
      <div
        v-for="dept in campus.departments"
        :key="dept.id"
        class="dept-card"
        :class="{ 'dept-card--disabled': !dept.active }"
        role="button"
        :tabindex="dept.active ? 0 : -1"
        :aria-disabled="!dept.active"
        @click="dept.active && handleSelect(dept.id)"
        @keydown.enter="dept.active && handleSelect(dept.id)"
      >
        <div class="dept-card__header">
          <h3 class="dept-card__short">{{ dept.shortName }}</h3>
          <span v-if="!dept.active" class="dept-card__badge">Em breve</span>
        </div>
        <p class="dept-card__name">{{ dept.name }}</p>
        <p class="dept-card__description">{{ dept.description }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dept-select {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem 1rem;
}
.dept-select__header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 2rem;
}
.back-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #1D9E75;
  font-size: 0.95rem;
  padding: 0;
  white-space: nowrap;
  margin-top: 0.3rem;
}
.dept-select__title h1 {
  margin: 0 0 0.25rem;
  font-size: 1.5rem;
}
.dept-select__title p {
  margin: 0;
  color: #666;
  font-size: 0.9rem;
}
.dept-select__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
}
.dept-card {
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  padding: 1.25rem;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
  background: white;
}
.dept-card:hover:not(.dept-card--disabled) {
  border-color: #1D9E75;
  box-shadow: 0 2px 8px rgba(29, 158, 117, 0.1);
}
.dept-card--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.dept-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.35rem;
}
.dept-card__short {
  margin: 0;
  font-size: 1.1rem;
}
.dept-card__badge {
  font-size: 0.75rem;
  background: #f0f0f0;
  color: #888;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
}
.dept-card__name {
  font-size: 0.8rem;
  color: #888;
  margin: 0 0 0.4rem;
}
.dept-card__description {
  font-size: 0.85rem;
  color: #666;
  margin: 0;
}
.state-error {
  color: #c0392b;
  font-size: 0.9rem;
}
</style>
