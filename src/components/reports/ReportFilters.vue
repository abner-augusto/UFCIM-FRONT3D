<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/services/api';

const auth = useAuthStore();

const emit = defineEmits<{
  apply: [filters: { startDate: string; endDate: string; campus: string; department: string }];
}>();

const today = new Date();
const thirtyDaysAgo = new Date(today);
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const startDate = ref(thirtyDaysAgo.toISOString().slice(0, 10));
const endDate = ref(today.toISOString().slice(0, 10));
const selectedCampus = ref('');
const selectedDepartment = ref('');

const campuses = ref<string[]>([]);
const departments = ref<{ id: string; name: string }[]>([]);

onMounted(async () => {
  try {
    const deps = await api.listDepartments(auth.token);
    departments.value = deps;
    const uniqueCampuses = [...new Set(deps.map((d) => d.campus))];
    campuses.value = uniqueCampuses;
  } catch {
    // Silently fail — filters still work
  }
});

function applyFilters() {
  emit('apply', {
    startDate: startDate.value,
    endDate: endDate.value,
    campus: selectedCampus.value,
    department: selectedDepartment.value,
  });
}
</script>

<template>
  <div class="filters-container">
    <div class="filter-row">
      <div class="filter-group">
        <label for="startDate">Data início</label>
        <input id="startDate" v-model="startDate" type="date" class="filter-input" />
      </div>

      <div class="filter-group">
        <label for="endDate">Data fim</label>
        <input id="endDate" v-model="endDate" type="date" class="filter-input" />
      </div>

      <div class="filter-group">
        <label for="campus">Campus</label>
        <select id="campus" v-model="selectedCampus" class="filter-input">
          <option value="">Todos</option>
          <option v-for="c in campuses" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>

      <div class="filter-group">
        <label for="department">Departamento</label>
        <select id="department" v-model="selectedDepartment" class="filter-input">
          <option value="">Todos</option>
          <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
        </select>
      </div>

      <div class="filter-actions">
        <button class="btn-apply" @click="applyFilters">Aplicar</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.filters-container {
  background: white;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  padding: 1rem 1.25rem;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.75rem;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 140px;
  flex: 1;
}

.filter-group label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.filter-input {
  padding: 0.5rem 0.6rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 0.85rem;
  color: #333;
  background: white;
  min-height: 36px;
}

.filter-input:focus {
  outline: none;
  border-color: var(--color-brand);
}

.filter-actions {
  display: flex;
  align-items: flex-end;
  flex-shrink: 0;
}

.btn-apply {
  padding: 0.5rem 1.25rem;
  background: var(--color-brand, #1D9E75);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  min-height: 36px;
  transition: background 0.15s;
}

.btn-apply:hover {
  background: #178a63;
}
</style>
