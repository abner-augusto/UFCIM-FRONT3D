<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/services/api';
import type { Reservation } from '@/types/reservation';
import { TIME_SLOT_LABELS, TIME_SLOT_RANGES, STATUS_LABELS } from '@/types/reservation';
import type { TimeSlot } from '@/types/reservation';

const auth = useAuthStore();

const reservations = ref<Reservation[]>([]);
const loading = ref(true);
const errorMsg = ref<string | null>(null);
const cancelling = ref<string | null>(null);

onMounted(async () => {
  await loadReservations();
});

async function loadReservations() {
  loading.value = true;
  errorMsg.value = null;
  try {
    const result = await api.getMyReservations(auth.token);
    reservations.value = result?.data ?? (Array.isArray(result) ? (result as unknown as Reservation[]) : []);
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

const dateLabel = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
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
      <li v-for="r in reservations" :key="r.id" class="reservation-card">
        <div class="reservation-card__info">
          <h3>{{ r.spaceName }}</h3>
          <p>{{ dateLabel(r.date) }}</p>
          <p>{{ periodLabel(r.startTime, r.endTime) }}</p>
        </div>
        <div class="reservation-card__right">
          <span class="status-badge" :class="`status-badge--${r.status}`">
            {{ STATUS_LABELS[r.status] }}
          </span>
          <button
            v-if="r.status === 'pending' || r.status === 'confirmed'"
            class="cancel-btn"
            :disabled="cancelling === r.id"
            @click="handleCancel(r.id)"
          >
            {{ cancelling === r.id ? 'Cancelando...' : 'Cancelar' }}
          </button>
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
.reservation-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  padding: 1rem 1.25rem;
  background: white;
}
.reservation-card__info h3 {
  margin: 0 0 0.25rem;
  font-size: 1rem;
}
.reservation-card__info p {
  margin: 0;
  color: #666;
  font-size: 0.85rem;
}
.reservation-card__right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}
.status-badge {
  font-size: 0.75rem;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-weight: 500;
}
.status-badge--pending { background: #fef3c7; color: #92400e; }
.status-badge--confirmed { background: #d1fae5; color: #065f46; }
.status-badge--cancelled { background: #fee2e2; color: #991b1b; }
.status-badge--completed { background: #f0f0f0; color: #555; }
.cancel-btn {
  font-size: 0.8rem;
  padding: 0.3rem 0.7rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: none;
  cursor: pointer;
  color: #c0392b;
}
.cancel-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.state-msg { color: #888; font-size: 0.9rem; }
.state-error { color: #c0392b; font-size: 0.9rem; }
.state-empty { color: #888; font-size: 0.9rem; text-align: center; padding: 3rem 0; }
</style>
