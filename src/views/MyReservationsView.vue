<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/services/api';
import type { Reservation } from '@/types/reservation';
import { TIME_SLOT_LABELS, TIME_SLOT_RANGES, STATUS_LABELS, PURPOSE_OPTIONS } from '@/types/reservation';
import { SPACE_TYPE_LABELS } from '@/types/space';
import type { TimeSlot } from '@/types/reservation';

const auth = useAuthStore();

const reservations = ref<Reservation[]>([]);
const loading = ref(true);
const errorMsg = ref<string | null>(null);
const cancelling = ref<string | null>(null);
const expandedId = ref<string | null>(null);

const PURPOSE_LABELS = Object.fromEntries(PURPOSE_OPTIONS.map(o => [o.value, o.label]));

onMounted(async () => {
  await loadReservations();
});

async function loadReservations() {
  loading.value = true;
  errorMsg.value = null;
  try {
    reservations.value = await api.getMyReservations(auth.token);
  } catch {
    errorMsg.value = 'Não foi possível carregar suas reservas.';
  } finally {
    loading.value = false;
  }
}

async function handleCancel(id: string) {
  if (!confirm('Tem certeza que deseja cancelar esta reserva?')) return;
  cancelling.value = id;
  try {
    await api.cancelReservation(auth.token, id);
    await loadReservations();
  } catch {
    errorMsg.value = 'Não foi possível cancelar a reserva.';
  } finally {
    cancelling.value = null;
  }
}

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id;
}

const dateLabel = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

const dateShort = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

const datetimeLabel = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

function periodLabel(startTime: string, endTime: string): string {
  const namedSlot = (Object.entries(TIME_SLOT_RANGES) as [TimeSlot, { startTime: string; endTime: string }][])
    .find(([, r]) => r.startTime === startTime && r.endTime === endTime);
  const range = `${startTime}–${endTime}`;
  return namedSlot ? `${range} (${TIME_SLOT_LABELS[namedSlot[0]]})` : range;
}
</script>

<template>
  <div class="my-reservations-view">
    <h1>Minhas Reservas</h1>

    <div v-if="loading" class="state-msg">Carregando reservas...</div>
    <div v-else-if="errorMsg" class="state-error">{{ errorMsg }}</div>
    <div v-else-if="reservations.length === 0" class="state-empty">
      <p>Você ainda não tem nenhuma reserva.</p>
    </div>

    <ul v-else class="reservation-list">
      <li
        v-for="r in reservations"
        :key="r.id"
        class="reservation-card"
        :class="{ 'reservation-card--expanded': expandedId === r.id }"
      >
        <!-- Summary row — always visible -->
        <button class="reservation-card__summary" @click="toggleExpand(r.id)">
          <div class="reservation-card__info">
            <h3>{{ r.space?.name ?? r.space?.number ?? r.spaceId }}</h3>
            <p>{{ dateLabel(r.date) }}</p>
            <p>{{ periodLabel(r.startTime, r.endTime) }}</p>
          </div>
          <div class="reservation-card__right">
            <span class="status-badge" :class="`status-badge--${r.status}`">
              {{ STATUS_LABELS[r.status] }}
            </span>
            <span class="expand-chevron" :class="{ rotated: expandedId === r.id }">›</span>
          </div>
        </button>

        <!-- Detail panel — visible when expanded -->
        <div v-if="expandedId === r.id" class="reservation-detail">
          <!-- Space info -->
          <section class="detail-section">
            <p class="detail-section__title">Espaço</p>
            <div class="detail-grid">
              <div v-if="r.space?.name" class="detail-item">
                <span class="detail-label">Nome</span>
                <span class="detail-value">{{ r.space.name }}</span>
              </div>
              <div v-if="r.space?.number" class="detail-item">
                <span class="detail-label">Número</span>
                <span class="detail-value">{{ r.space.number }}</span>
              </div>
              <div v-if="r.space?.block" class="detail-item">
                <span class="detail-label">Bloco</span>
                <span class="detail-value">{{ r.space.block }}</span>
              </div>
              <div v-if="r.space?.campus" class="detail-item">
                <span class="detail-label">Campus</span>
                <span class="detail-value">{{ r.space.campus }}</span>
              </div>
              <div v-if="r.space?.type" class="detail-item">
                <span class="detail-label">Tipo</span>
                <span class="detail-value">{{ SPACE_TYPE_LABELS[r.space.type] ?? r.space.type }}</span>
              </div>
              <div v-if="r.space?.capacity != null" class="detail-item">
                <span class="detail-label">Capacidade</span>
                <span class="detail-value">{{ r.space.capacity }} pessoas</span>
              </div>
              <div v-if="r.space?.department" class="detail-item">
                <span class="detail-label">Departamento</span>
                <span class="detail-value">{{ r.space.department }}</span>
              </div>
            </div>
          </section>

          <!-- Reservation info -->
          <section class="detail-section">
            <p class="detail-section__title">Reserva</p>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Data</span>
                <span class="detail-value">{{ dateShort(r.date) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Horário</span>
                <span class="detail-value">{{ r.startTime }}–{{ r.endTime }}</span>
              </div>
              <div v-if="r.purpose" class="detail-item">
                <span class="detail-label">Finalidade</span>
                <span class="detail-value">{{ PURPOSE_LABELS[r.purpose] ?? r.purpose }}</span>
              </div>
              <div v-if="r.recurrenceId" class="detail-item">
                <span class="detail-label">Recorrência</span>
                <span class="detail-value detail-value--mono">{{ r.recurrenceId }}</span>
              </div>
              <div v-if="r.changeOrigin" class="detail-item">
                <span class="detail-label">Origem da alteração</span>
                <span class="detail-value">{{ r.changeOrigin }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Criada em</span>
                <span class="detail-value">{{ datetimeLabel(r.createdAt) }}</span>
              </div>
              <div v-if="r.updatedAt !== r.createdAt" class="detail-item">
                <span class="detail-label">Atualizada em</span>
                <span class="detail-value">{{ datetimeLabel(r.updatedAt) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">ID</span>
                <span class="detail-value detail-value--mono">{{ r.id }}</span>
              </div>
            </div>
          </section>

          <!-- Cancellation reason -->
          <div v-if="r.status === 'canceled' && r.cancelReason" class="detail-cancel-reason">
            <p class="detail-cancel-reason__label">Motivo do cancelamento</p>
            <p class="detail-cancel-reason__text">{{ r.cancelReason }}</p>
          </div>

          <!-- Cancel action -->
          <div v-if="r.status === 'confirmed'" class="detail-actions">
            <button
              class="cancel-btn"
              :disabled="cancelling === r.id"
              @click="handleCancel(r.id)"
            >
              {{ cancelling === r.id ? 'Cancelando...' : 'Cancelar reserva' }}
            </button>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.my-reservations-view {
  max-width: 640px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}
h1 {
  margin: 0 0 1.5rem;
  font-size: 1.3rem;
}
.reservation-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Card */
.reservation-card {
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  background: white;
  overflow: hidden;
  transition: border-color 0.15s;
}
.reservation-card--expanded {
  border-color: #1D9E75;
}

/* Summary row */
.reservation-card__summary {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  width: 100%;
  padding: 1rem 1.25rem;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  gap: 0.75rem;
}
.reservation-card__summary:hover {
  background: #f9fafb;
}

.reservation-card__info h3 {
  margin: 0 0 0.25rem;
  font-size: 1rem;
  font-weight: 600;
  color: #111;
}
.reservation-card__info p {
  margin: 0;
  color: #666;
  font-size: 0.85rem;
  line-height: 1.5;
}
.reservation-card__right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.4rem;
  flex-shrink: 0;
}

/* Chevron */
.expand-chevron {
  font-size: 1.1rem;
  color: #aaa;
  line-height: 1;
  transform: rotate(90deg);
  transition: transform 0.2s ease;
  display: inline-block;
}
.expand-chevron.rotated {
  transform: rotate(-90deg);
}

/* Status badges */
.status-badge {
  font-size: 0.75rem;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-weight: 500;
  white-space: nowrap;
}
.status-badge--confirmed  { background: #d1fae5; color: #065f46; }
.status-badge--canceled   { background: #fee2e2; color: #991b1b; }
.status-badge--modified   { background: #fef3c7; color: #92400e; }
.status-badge--overridden { background: #ede9fe; color: #5b21b6; }

/* Detail panel */
.reservation-detail {
  border-top: 1px solid #f0f0f0;
  padding: 1rem 1.25rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  animation: detail-in 0.18s ease both;
}

@keyframes detail-in {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}

.detail-section__title {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #bbb;
  margin: 0 0 0.6rem;
}

.detail-grid {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 0.84rem;
  border-bottom: 1px solid #f5f5f5;
  padding-bottom: 0.3rem;
  gap: 0.5rem;
}
.detail-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.detail-label {
  color: #999;
  flex-shrink: 0;
}
.detail-value {
  font-weight: 500;
  color: #222;
  text-align: right;
  word-break: break-all;
}
.detail-value--mono {
  font-family: monospace;
  font-size: 0.75rem;
  color: #666;
}

/* Cancellation reason */
.detail-cancel-reason {
  padding: 0.65rem 0.9rem;
  border-radius: 10px;
  background: #fff5f5;
  border-left: 3px solid #c0392b;
}
.detail-cancel-reason__label {
  margin: 0 0 0.2rem;
  color: #991b1b;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.detail-cancel-reason__text {
  margin: 0;
  color: #7f1d1d;
  font-size: 0.84rem;
}

/* Actions */
.detail-actions {
  padding-top: 0.25rem;
}
.cancel-btn {
  font-size: 0.85rem;
  padding: 0.5rem 1rem;
  border: 1.5px solid #c0392b;
  border-radius: 8px;
  background: none;
  cursor: pointer;
  color: #c0392b;
  font-weight: 500;
  transition: background 0.15s;
}
.cancel-btn:hover { background: #fff0f0; }
.cancel-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* States */
.state-msg { color: #888; font-size: 0.9rem; }
.state-error { color: #c0392b; font-size: 0.9rem; }
.state-empty { color: #888; font-size: 0.9rem; text-align: center; padding: 3rem 0; }
</style>
