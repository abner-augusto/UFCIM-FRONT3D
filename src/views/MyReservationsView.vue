<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
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
const cancellingSeries = ref<string | null>(null);
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

async function handleCancelSeries(recurrenceId: string) {
  if (!confirm('Tem certeza que deseja cancelar TODAS as reservas futuras desta série?')) return;
  cancellingSeries.value = recurrenceId;
  try {
    await api.cancelReservationSeries(auth.token, recurrenceId);
    await loadReservations();
  } catch {
    errorMsg.value = 'Não foi possível cancelar a série de reservas.';
  } finally {
    cancellingSeries.value = null;
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

function isCompleted(r: Reservation): boolean {
  const normalizedEnd = r.endTime === '24:00' ? '23:59' : r.endTime;
  return new Date(`${r.date}T${normalizedEnd}:00`) < new Date();
}

function hasFutureOccurrences(items: Reservation[]): boolean {
  return items.some(r => r.status === 'confirmed' && !isCompleted(r));
}

interface GroupedReservation {
  id: string; // recurrenceId if recurrent, else reservation id
  isRecurrent: boolean;
  recurrenceId: string | null;
  items: Reservation[];
  main: Reservation;
}

const groupedReservations = computed<GroupedReservation[]>(() => {
  const groups: { [key: string]: { isRecurrent: boolean; items: Reservation[] } } = {};
  
  for (const r of reservations.value) {
    const key = r.recurrenceId || r.id;
    if (!groups[key]) {
      groups[key] = { isRecurrent: !!r.recurrenceId, items: [] };
    }
    groups[key].items.push(r);
  }
  
  const result: GroupedReservation[] = [];
  const now = new Date();
  
  for (const [key, group] of Object.entries(groups)) {
    group.items.sort((a, b) => a.date.localeCompare(b.date));
    
    // For main, pick the first active future reservation, or the last one if none are active
    let main = group.items.find(r => {
      const normalizedEnd = r.endTime === '24:00' ? '23:59' : r.endTime;
      return new Date(`${r.date}T${normalizedEnd}:00`) >= now && r.status === 'confirmed';
    });
    if (!main) main = group.items[group.items.length - 1];

    result.push({
      id: key,
      isRecurrent: group.isRecurrent,
      recurrenceId: group.isRecurrent ? key : null,
      items: group.items,
      main
    });
  }
  
  // Sort overall by main date descending
  result.sort((a, b) => b.main.date.localeCompare(a.main.date));
  
  return result;
});
</script>

<template>
  <div class="my-reservations-view">
    <h1>Minhas Reservas</h1>

    <div v-if="loading" class="state-msg">Carregando reservas...</div>
    <div v-else-if="errorMsg" class="state-error">{{ errorMsg }}</div>
    <div v-else-if="groupedReservations.length === 0" class="state-empty">
      <p>Você ainda não tem nenhuma reserva.</p>
    </div>

    <ul v-else class="reservation-list">
      <li
        v-for="group in groupedReservations"
        :key="group.id"
        class="reservation-card"
        :class="{ 'reservation-card--expanded': expandedId === group.id }"
      >
        <!-- Summary row — always visible -->
        <button class="reservation-card__summary" @click="toggleExpand(group.id)">
          <div class="reservation-card__info">
            <h3>{{ group.main.space?.name ?? group.main.space?.number ?? group.main.spaceId }}</h3>
            <p v-if="!group.isRecurrent">{{ dateLabel(group.main.date) }}</p>
            <p v-else>Recorrente: {{ group.items.length }} ocorrências</p>
            <p>{{ periodLabel(group.main.startTime, group.main.endTime) }}</p>
          </div>
          <div class="reservation-card__right">
            <template v-if="!group.isRecurrent">
              <span v-if="isCompleted(group.main) && group.main.status === 'confirmed'" class="status-badge status-badge--completed">
                Concluída
              </span>
              <span v-else class="status-badge" :class="`status-badge--${group.main.status}`">
                {{ STATUS_LABELS[group.main.status] }}
              </span>
            </template>
            <template v-else>
               <span class="status-badge status-badge--recurrent">Série</span>
            </template>
            <span class="expand-chevron" :class="{ rotated: expandedId === group.id }">›</span>
          </div>
        </button>

        <!-- Detail panel — visible when expanded -->
        <div v-if="expandedId === group.id" class="reservation-detail">
          <!-- Space info -->
          <section class="detail-section">
            <p class="detail-section__title">Espaço</p>
            <div class="detail-grid">
              <div v-if="group.main.space?.name" class="detail-item">
                <span class="detail-label">Nome</span>
                <span class="detail-value">{{ group.main.space.name }}</span>
              </div>
              <div v-if="group.main.space?.number" class="detail-item">
                <span class="detail-label">Número</span>
                <span class="detail-value">{{ group.main.space.number }}</span>
              </div>
              <div v-if="group.main.space?.block" class="detail-item">
                <span class="detail-label">Bloco</span>
                <span class="detail-value">{{ group.main.space.block }}</span>
              </div>
              <div v-if="group.main.space?.campus" class="detail-item">
                <span class="detail-label">Campus</span>
                <span class="detail-value">{{ group.main.space.campus }}</span>
              </div>
              <div v-if="group.main.space?.type" class="detail-item">
                <span class="detail-label">Tipo</span>
                <span class="detail-value">{{ SPACE_TYPE_LABELS[group.main.space.type] ?? group.main.space.type }}</span>
              </div>
              <div v-if="group.main.space?.capacity != null" class="detail-item">
                <span class="detail-label">Capacidade</span>
                <span class="detail-value">{{ group.main.space.capacity }} pessoas</span>
              </div>
              <div v-if="group.main.space?.department" class="detail-item">
                <span class="detail-label">Departamento</span>
                <span class="detail-value">{{ group.main.space.department }}</span>
              </div>
            </div>
          </section>

          <!-- Reservation info for single or group -->
          <section class="detail-section">
            <p class="detail-section__title">{{ group.isRecurrent ? 'Série de Reservas' : 'Reserva' }}</p>
            <div class="detail-grid">
              <div v-if="!group.isRecurrent" class="detail-item">
                <span class="detail-label">Data</span>
                <span class="detail-value">{{ dateShort(group.main.date) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Horário</span>
                <span class="detail-value">{{ group.main.startTime }}–{{ group.main.endTime }}</span>
              </div>
              <div v-if="group.main.purpose" class="detail-item">
                <span class="detail-label">Finalidade</span>
                <span class="detail-value">{{ PURPOSE_LABELS[group.main.purpose] ?? group.main.purpose }}</span>
              </div>
              <div v-if="group.isRecurrent" class="detail-item">
                <span class="detail-label">Recorrência ID</span>
                <span class="detail-value detail-value--mono">{{ group.id }}</span>
              </div>
              <div v-if="group.main.changeOrigin" class="detail-item">
                <span class="detail-label">Origem da alteração</span>
                <span class="detail-value">{{ group.main.changeOrigin }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Criada em</span>
                <span class="detail-value">{{ datetimeLabel(group.main.createdAt) }}</span>
              </div>
              <div v-if="group.main.updatedAt !== group.main.createdAt" class="detail-item">
                <span class="detail-label">Atualizada em</span>
                <span class="detail-value">{{ datetimeLabel(group.main.updatedAt) }}</span>
              </div>
              <div v-if="!group.isRecurrent" class="detail-item">
                <span class="detail-label">ID</span>
                <span class="detail-value detail-value--mono">{{ group.main.id }}</span>
              </div>
            </div>
          </section>

          <!-- Occurrences for recurrent -->
          <div v-if="group.isRecurrent" class="recurrence-list">
            <p class="detail-section__title" style="margin-top: 1rem">Ocorrências</p>
            <div v-for="r in group.items" :key="r.id" class="recurrence-item">
              <span class="recurrence-date">{{ dateShort(r.date) }}</span>
              <div class="recurrence-actions">
                <span v-if="isCompleted(r) && r.status === 'confirmed'" class="status-badge status-badge--completed">
                  Concluída
                </span>
                <span v-else class="status-badge" :class="`status-badge--${r.status}`">
                  {{ STATUS_LABELS[r.status] }}
                </span>
                <button v-if="r.status === 'confirmed' && !isCompleted(r)" class="text-cancel-btn" @click="handleCancel(r.id)" :disabled="cancelling === r.id || cancellingSeries === group.id">
                  {{ cancelling === r.id ? '...' : 'Cancelar' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Cancellation reason for single -->
          <div v-if="!group.isRecurrent && group.main.status === 'canceled' && group.main.cancelReason" class="detail-cancel-reason">
            <p class="detail-cancel-reason__label">Motivo do cancelamento</p>
            <p class="detail-cancel-reason__text">{{ group.main.cancelReason }}</p>
          </div>

          <!-- Actions -->
          <div class="detail-actions" style="margin-top: 1rem">
            <button
              v-if="!group.isRecurrent && group.main.status === 'confirmed' && !isCompleted(group.main)"
              class="cancel-btn"
              :disabled="cancelling === group.main.id"
              @click="handleCancel(group.main.id)"
            >
              {{ cancelling === group.main.id ? 'Cancelando...' : 'Cancelar reserva' }}
            </button>

            <button
              v-if="group.isRecurrent && hasFutureOccurrences(group.items)"
              class="cancel-btn cancel-btn--bulk"
              :disabled="cancellingSeries === group.id"
              @click="handleCancelSeries(group.id)"
            >
              {{ cancellingSeries === group.id ? 'Cancelando...' : 'Cancelar todas as datas futuras' }}
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
.status-badge--completed  { background: #f3f4f6; color: #6b7280; }
.status-badge--recurrent  { background: #e0f2fe; color: #0369a1; }

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

/* Recurrence List */
.recurrence-list {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.recurrence-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  padding: 0.4rem 0;
  border-bottom: 1px solid #f5f5f5;
}
.recurrence-item:last-child {
  border-bottom: none;
}
.recurrence-date {
  color: #333;
}
.recurrence-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.text-cancel-btn {
  background: none;
  border: none;
  color: #c0392b;
  font-size: 0.75rem;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
}
.text-cancel-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  text-decoration: none;
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
.cancel-btn--bulk {
  width: 100%;
}

/* States */
.state-msg { color: #888; font-size: 0.9rem; }
.state-error { color: #c0392b; font-size: 0.9rem; }
.state-empty { color: #888; font-size: 0.9rem; text-align: center; padding: 3rem 0; }
</style>
