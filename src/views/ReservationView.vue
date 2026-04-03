<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useReservationStore } from '@/stores/reservation';
import { api } from '@/services/api';
import type { Space } from '@/types/space';
import type { Availability, TimeSlot } from '@/types/reservation';
import { TIME_SLOT_LABELS, PURPOSE_OPTIONS } from '@/types/reservation';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const reservationStore = useReservationStore();

const spaceId = route.params.spaceId as string;

const space = ref<Space | null>(null);
const availability = ref<Availability | null>(null);
const selectedDate = ref('');
const selectedSlot = ref<TimeSlot | null>(null);
const selectedPurpose = ref('');
const loadingSpace = ref(true);
const loadingAvailability = ref(false);
const errorMsg = ref<string | null>(null);

const today = new Date().toISOString().split('T')[0];

onMounted(async () => {
  try {
    space.value = await api.getSpace(auth.token, spaceId);
  } catch {
    errorMsg.value = 'Não foi possível carregar os dados do espaço.';
  } finally {
    loadingSpace.value = false;
  }
});

watch(selectedDate, async (date) => {
  if (!date) return;
  selectedSlot.value = null;
  loadingAvailability.value = true;
  try {
    availability.value = await api.getAvailability(auth.token, spaceId, date);
  } catch {
    errorMsg.value = 'Não foi possível verificar disponibilidade.';
  } finally {
    loadingAvailability.value = false;
  }
});

function isSlotAvailable(slot: TimeSlot): boolean {
  return availability.value?.slots[slot] ?? false;
}

function canContinue() {
  return selectedDate.value && selectedSlot.value && selectedPurpose.value;
}

function handleContinue() {
  if (!canContinue() || !space.value) return;
  reservationStore.setSpace(spaceId, space.value.name);
  reservationStore.setSchedule(selectedDate.value, selectedSlot.value!);
  reservationStore.setPurpose(selectedPurpose.value);
  router.push({ name: 'reservation-confirm' });
}
</script>

<template>
  <div class="reservation-view">
    <div class="reservation-header">
      <button class="back-btn" @click="router.back()">← Voltar</button>
      <h1>Fazer Reserva</h1>
    </div>

    <div v-if="loadingSpace" class="state-msg">Carregando espaço...</div>
    <div v-else-if="errorMsg" class="state-error">{{ errorMsg }}</div>

    <div v-else-if="space" class="reservation-form">
      <div class="space-info">
        <h2>{{ space.name }}</h2>
        <p>{{ space.building }}<span v-if="space.floor"> — Andar {{ space.floor }}</span></p>
        <p v-if="space.capacity" class="space-capacity">Capacidade: {{ space.capacity }} pessoas</p>
      </div>

      <div class="form-section">
        <label class="form-label">Data da reserva</label>
        <input
          type="date"
          class="form-input"
          v-model="selectedDate"
          :min="today"
        />
      </div>

      <div v-if="selectedDate" class="form-section">
        <label class="form-label">Período</label>
        <div v-if="loadingAvailability" class="state-msg">Verificando disponibilidade...</div>
        <div v-else class="slot-grid">
          <button
            v-for="(label, slot) in TIME_SLOT_LABELS"
            :key="slot"
            class="slot-btn"
            :class="{
              'slot-btn--selected': selectedSlot === slot,
              'slot-btn--unavailable': !isSlotAvailable(slot as TimeSlot),
            }"
            :disabled="!isSlotAvailable(slot as TimeSlot)"
            @click="selectedSlot = slot as TimeSlot"
          >
            {{ label }}
          </button>
        </div>
      </div>

      <div v-if="selectedSlot" class="form-section">
        <label class="form-label">Finalidade</label>
        <select class="form-input" v-model="selectedPurpose">
          <option value="" disabled>Selecione uma finalidade</option>
          <option v-for="opt in PURPOSE_OPTIONS" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>

      <button
        class="continue-btn"
        :disabled="!canContinue()"
        @click="handleContinue"
      >
        Continuar
      </button>
    </div>
  </div>
</template>

<style scoped>
.reservation-view {
  max-width: 540px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}
.reservation-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.reservation-header h1 {
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
.space-info {
  background: #f8f8f8;
  border-radius: 10px;
  padding: 1rem 1.25rem;
  margin-bottom: 1.5rem;
}
.space-info h2 {
  margin: 0 0 0.25rem;
  font-size: 1.1rem;
}
.space-info p {
  margin: 0;
  color: #666;
  font-size: 0.85rem;
}
.space-capacity {
  margin-top: 0.35rem !important;
}
.form-section {
  margin-bottom: 1.25rem;
}
.form-label {
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #333;
}
.form-input {
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 0.95rem;
  box-sizing: border-box;
}
.slot-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.slot-btn {
  padding: 0.75rem 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  text-align: left;
  font-size: 0.9rem;
  transition: border-color 0.15s, background 0.15s;
}
.slot-btn--selected {
  border-color: #1D9E75;
  background: #e8f5f0;
  color: #1D9E75;
  font-weight: 600;
}
.slot-btn--unavailable {
  opacity: 0.4;
  cursor: not-allowed;
  background: #f5f5f5;
}
.continue-btn {
  width: 100%;
  padding: 0.85rem;
  border: none;
  border-radius: 10px;
  background: #1D9E75;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 0.5rem;
}
.continue-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.continue-btn:hover:not(:disabled) {
  background: #178a65;
}
.state-msg {
  color: #888;
  font-size: 0.9rem;
  padding: 0.5rem 0;
}
.state-error {
  color: #c0392b;
  font-size: 0.9rem;
}
</style>
