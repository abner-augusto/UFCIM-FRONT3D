<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useReservationStore } from '@/stores/reservation';
import { api } from '@/services/api';
import { TIME_SLOT_LABELS, PURPOSE_OPTIONS } from '@/types/reservation';

const router = useRouter();
const auth = useAuthStore();
const reservationStore = useReservationStore();

const loading = ref(false);
const errorMsg = ref<string | null>(null);

onMounted(() => {
  if (!reservationStore.isReady) {
    router.replace({ name: 'campus-select' });
  }
});

const purposeLabel = (value: string) =>
  PURPOSE_OPTIONS.find((o) => o.value === value)?.label ?? value;

const slotLabel = (slot: string) =>
  TIME_SLOT_LABELS[slot as keyof typeof TIME_SLOT_LABELS] ?? slot;

const dateLabel = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

async function handleConfirm() {
  if (!reservationStore.isReady) return;
  loading.value = true;
  errorMsg.value = null;
  try {
    await api.createReservation(auth.token, {
      spaceId: reservationStore.spaceId!,
      date: reservationStore.date!,
      startTime: reservationStore.startTime!,
      endTime: reservationStore.endTime!,
      purpose: reservationStore.purpose!,
    });
    reservationStore.reset();
    router.push({ name: 'my-reservations' });
  } catch {
    errorMsg.value = 'Não foi possível confirmar a reserva. Tente novamente.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="confirm-view">
    <div class="confirm-header">
      <button class="back-btn" @click="router.back()">← Voltar</button>
      <h1>Confirmar Reserva</h1>
    </div>

    <div class="confirm-card">
      <div class="confirm-row">
        <span class="confirm-label">Espaço</span>
        <span class="confirm-value">{{ reservationStore.spaceName }}</span>
      </div>
      <div class="confirm-row">
        <span class="confirm-label">Data</span>
        <span class="confirm-value">{{ dateLabel(reservationStore.date!) }}</span>
      </div>
      <div class="confirm-row">
        <span class="confirm-label">Período</span>
        <span class="confirm-value">{{ slotLabel(reservationStore.selectedSlot!) }}</span>
      </div>
      <div class="confirm-row">
        <span class="confirm-label">Finalidade</span>
        <span class="confirm-value">{{ purposeLabel(reservationStore.purpose!) }}</span>
      </div>
    </div>

    <p v-if="errorMsg" class="state-error">{{ errorMsg }}</p>

    <button class="confirm-btn" :disabled="loading" @click="handleConfirm">
      {{ loading ? 'Confirmando...' : 'Confirmar Reserva' }}
    </button>
  </div>
</template>

<style scoped>
.confirm-view {
  max-width: 540px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}
.confirm-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.confirm-header h1 {
  margin: 0;
  font-size: 1.3rem;
}
.back-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #1D9E75;
  font-size: 0.95rem;
  padding: 0;
}
.confirm-card {
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 1.5rem;
}
.confirm-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.9rem 1.25rem;
  border-bottom: 1px solid #f0f0f0;
}
.confirm-row:last-child {
  border-bottom: none;
}
.confirm-label {
  color: #888;
  font-size: 0.875rem;
}
.confirm-value {
  font-weight: 500;
  font-size: 0.9rem;
  text-align: right;
  max-width: 60%;
}
.confirm-btn {
  width: 100%;
  padding: 0.85rem;
  border: none;
  border-radius: 10px;
  background: #1D9E75;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}
.confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.confirm-btn:hover:not(:disabled) {
  background: #178a65;
}
.state-error {
  color: #c0392b;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}
</style>
