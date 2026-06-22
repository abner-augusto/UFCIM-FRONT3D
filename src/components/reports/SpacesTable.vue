<script setup lang="ts">
import { useRouter } from 'vue-router';
import type { SpaceReport } from '@/types/report';

defineProps<{
  spaces: SpaceReport[];
}>();

const router = useRouter();

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
    <h3 class="table-title">Detalhamento por Sala</h3>
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
          <tr v-for="s in spaces" :key="s.id" class="space-row" @click="goToReport(s.id)">
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

.table-title {
  margin: 0 0 1rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--foreground);
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
