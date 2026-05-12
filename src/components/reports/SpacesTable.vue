<script setup lang="ts">
import type { SpaceReport } from '@/types/report';

defineProps<{
  spaces: SpaceReport[];
}>();

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
          <tr v-for="s in spaces" :key="s.id">
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
  background: white;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  padding: 1.25rem;
}

.table-title {
  margin: 0 0 1rem;
  font-size: 1rem;
  font-weight: 600;
  color: #222;
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
  color: #888;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.6rem 0.75rem;
  border-bottom: 2px solid #eee;
}

.spaces-table td {
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid #f5f5f5;
  color: #333;
}

.cell-name {
  font-weight: 500;
  color: #111;
}

.taxa-badge {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
}

.taxa--alta {
  background: #fee2e2;
  color: #991b1b;
}

.taxa--media {
  background: #fef3c7;
  color: #92400e;
}

.taxa--baixa {
  background: #d1fae5;
  color: #065f46;
}

.empty-row {
  text-align: center;
  color: #aaa;
  padding: 2rem !important;
}
</style>
