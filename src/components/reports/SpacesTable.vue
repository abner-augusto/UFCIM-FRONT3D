<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { SpaceReport } from '@/types/report';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';

const props = defineProps<{
  spaces: SpaceReport[];
}>();

const router = useRouter();

type SortKey = 'default' | 'reservas' | 'taxa' | 'capacidade';
const sortBy = ref<SortKey>('default');

// Sort a copy so the incoming order (número/bloco, from the backend) is the
// 'default' baseline. Array.sort is stable, so ties keep that order.
const sortedSpaces = computed(() => {
  const list = [...props.spaces];
  switch (sortBy.value) {
    case 'reservas':
      return list.sort((a, b) => b.reservas - a.reservas);
    case 'taxa':
      return list.sort((a, b) => b.taxaOcupacao - a.taxaOcupacao);
    case 'capacidade':
      return list.sort((a, b) => b.capacidade - a.capacidade);
    default:
      return list;
  }
});

function goToReport(spaceId: string) {
  router.push({ name: 'space-report', params: { spaceId } });
}

function taxaClass(taxa: number): string {
  if (taxa >= 75) return 'taxa--alta';
  if (taxa >= 40) return 'taxa--media';
  return 'taxa--baixa';
}
</script>

<template>
  <div class="table-container">
    <div class="table-head">
      <h3 class="table-title">Detalhamento por Sala</h3>
      <label class="sort-control">
        <span class="sort-label">Ordenar por</span>
        <NativeSelect v-model="sortBy" class="sort-select" aria-label="Ordenar salas por">
          <NativeSelectOption value="default">Sala (padrão)</NativeSelectOption>
          <NativeSelectOption value="reservas">Mais reservadas</NativeSelectOption>
          <NativeSelectOption value="taxa">Maior ocupação</NativeSelectOption>
          <NativeSelectOption value="capacidade">Maior capacidade</NativeSelectOption>
        </NativeSelect>
      </label>
    </div>
    <div class="table-scroll">
      <table class="spaces-table">
        <thead>
          <tr>
            <th>Sala</th>
            <th>Número</th>
            <th>Bloco</th>
            <th>Tipo</th>
            <th>Capacidade</th>
            <th>Reservas</th>
            <th>Taxa</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in sortedSpaces" :key="s.id" class="space-row" @click="goToReport(s.id)">
            <td class="cell-name">{{ s.nome }}</td>
            <td>{{ s.numero }}</td>
            <td>{{ s.bloco }}</td>
            <td>{{ s.tipo }}</td>
            <td>{{ s.capacidade }}</td>
            <td>{{ s.reservas }}</td>
            <td>
              <span class="taxa-badge" :class="taxaClass(s.taxaOcupacao)">
                {{ s.taxaOcupacao }}%
              </span>
            </td>
          </tr>
          <tr v-if="spaces.length === 0">
            <td colspan="7" class="empty-row">Nenhuma sala encontrada.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.table-container {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.25rem;
}

.table-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
  margin-bottom: 1rem;
}

.table-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--foreground);
}

.sort-control {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.sort-label {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  white-space: nowrap;
}

.sort-select {
  width: auto;
  min-width: 150px;
  height: 36px;
  font-size: 0.8rem;
}

.table-scroll {
  overflow-x: auto;
}

.spaces-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.spaces-table th {
  text-align: left;
  font-weight: 600;
  color: var(--muted-foreground);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.6rem 0.75rem;
  border-bottom: 2px solid var(--border);
}

.spaces-table td {
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid var(--border);
  color: var(--foreground);
}

.cell-name {
  font-weight: 500;
  color: var(--foreground);
}

.space-row {
  cursor: pointer;
  transition: background 0.15s;
}

.space-row:hover {
  background: var(--accent);
}

.taxa-badge {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
}

.taxa--alta {
  background: var(--danger-surface);
  color: var(--danger-fg);
}

.taxa--media {
  background: var(--warning-surface);
  color: var(--warning);
}

.taxa--baixa {
  background: var(--success-surface);
  color: var(--success);
}

.empty-row {
  text-align: center;
  color: var(--muted-foreground);
  padding: 2rem !important;
}
</style>
