<script setup lang="ts">
import type { Summary } from '@/types/report';

defineProps<{
  summary: Summary;
}>();
</script>

<template>
  <div class="summary-cards">
    <div class="card">
      <span class="card-icon">📊</span>
      <div class="card-body">
        <span class="card-value">{{ summary.ocupacaoMedia }}%</span>
        <span class="card-label">Ocupação Média</span>
      </div>
    </div>

    <div class="card">
      <span class="card-icon">📅</span>
      <div class="card-body">
        <span class="card-value">{{ summary.totalReservas }}</span>
        <span class="card-label">Total de Reservas</span>
      </div>
    </div>

    <div class="card">
      <span class="card-icon">🚪</span>
      <div class="card-body">
        <span class="card-value">{{ summary.salasUsadas }}</span>
        <span class="card-label">Salas Usadas</span>
      </div>
    </div>

  </div>
</template>

<style scoped>
.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
}

.card {
  background: white;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.card-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.card-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.card-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111;
  line-height: 1.2;
}

.card-label {
  font-size: 0.8rem;
  color: #777;
  margin-top: 0.15rem;
}
</style>
