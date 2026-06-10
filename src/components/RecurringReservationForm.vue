<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/services/api';
import { TIME_SLOT_LABELS, TIME_SLOT_RANGES } from '@/types/reservation';
import type { TimeSlot } from '@/types/reservation';
import { toLocalISODate } from '@/utils/date';

const props = defineProps<{
  spaceId: string;
  reservable: boolean | undefined;
}>();

const router = useRouter();
const auth = useAuthStore();
const today = toLocalISODate();

const startDate = ref('');
const endDate = ref('');
const dayOfWeek = ref<number | null>(null);
const description = ref('');
const selectedPeriod = ref<TimeSlot | null>(null);
const loading = ref(false);
const successMsg = ref<string | null>(null);
const errorMsg = ref<string | null>(null);

const minEndDate = computed(() => {
  if (!startDate.value) return today;
  const d = new Date(startDate.value + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  return toLocalISODate(d);
});

function canSubmit() {
  return (
    props.reservable !== false &&
    startDate.value &&
    endDate.value &&
    endDate.value > startDate.value &&
    dayOfWeek.value !== null &&
    selectedPeriod.value &&
    description.value.trim()
  );
}

async function handleSubmit() {
  if (!canSubmit()) return;
  const { startTime, endTime } = TIME_SLOT_RANGES[selectedPeriod.value!];
  loading.value = true;
  errorMsg.value = null;
  successMsg.value = null;
  try {
    const result = await api.createRecurringReservation(auth.token, {
      spaceId: props.spaceId,
      startDate: startDate.value,
      endDate: endDate.value,
      dayOfWeek: dayOfWeek.value!,
      startTime,
      endTime,
      description: description.value.trim() || undefined,
    });
    successMsg.value = `${result.created.length} reservas criadas, ${result.skipped.length} conflitos ignorados.`;
    setTimeout(() => router.push({ name: 'my-reservations' }), 2000);
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : 'Não foi possível criar as reservas recorrentes.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div>
    <div class="form-section">
      <label class="form-label">Data de início</label>
      <input type="date" class="form-input" v-model="startDate" :min="today" />
    </div>

    <div class="form-section">
      <label class="form-label">Data de fim</label>
      <input type="date" class="form-input" v-model="endDate" :min="minEndDate" />
    </div>

    <div class="form-section">
      <label class="form-label">Dia da semana</label>
      <select class="form-input" v-model="dayOfWeek">
        <option :value="null" disabled>Selecione um dia</option>
        <option :value="1">Segunda-feira</option>
        <option :value="2">Terça-feira</option>
        <option :value="3">Quarta-feira</option>
        <option :value="4">Quinta-feira</option>
        <option :value="5">Sexta-feira</option>
        <option :value="6">Sábado</option>
        <option :value="0">Domingo</option>
      </select>
    </div>

    <div class="form-section">
      <label class="form-label">Período</label>
      <div class="slot-grid">
        <button
          v-for="(label, slot) in TIME_SLOT_LABELS"
          :key="slot"
          class="slot-btn"
          :class="{ 'slot-btn--selected': selectedPeriod === slot }"
          @click="selectedPeriod = slot as TimeSlot"
        >
          {{ label }} ({{ TIME_SLOT_RANGES[slot as TimeSlot].startTime }}–{{ TIME_SLOT_RANGES[slot as TimeSlot].endTime }})
        </button>
      </div>
    </div>

    <div class="form-section">
      <label class="form-label">Descrição da recorrência</label>
      <input
        type="text"
        class="form-input"
        v-model="description"
        placeholder="Ex: Aula de Algoritmos — Semestre 2026.1"
      />
    </div>

    <p v-if="successMsg" class="state-success">{{ successMsg }}</p>
    <p v-if="errorMsg" class="state-error">{{ errorMsg }}</p>

    <div class="form-actions">
      <button
        class="continue-btn"
        :disabled="!canSubmit() || loading"
        @click="handleSubmit"
      >
        {{ loading ? 'Agendando...' : 'Agendar Reservas Recorrentes' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.form-section { margin-bottom: 1.25rem; }
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
  min-height: var(--tap-min, 44px);
}
.slot-grid { display: flex; flex-direction: column; gap: 0.5rem; }
.slot-btn {
  padding: 0.75rem 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  text-align: left;
  font-size: 0.9rem;
  transition: border-color 0.15s, background 0.15s;
  min-height: var(--tap-min, 44px);
}
.slot-btn--selected {
  border-color: #1D9E75;
  background: #e8f5f0;
  color: #1D9E75;
  font-weight: 600;
}
.form-actions {
  margin-top: 1rem;
}
@media (max-width: 767px) {
  .form-actions {
    position: sticky;
    bottom: calc(var(--bottom-bar-h, 0px) + var(--safe-bottom, 0px));
    background: white;
    padding: 0.75rem 0 calc(0.5rem + var(--safe-bottom, 0px));
    z-index: 5;
    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.06);
    margin-left: -1rem;
    margin-right: -1rem;
    padding-left: 1rem;
    padding-right: 1rem;
  }
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
  min-height: var(--tap-min, 44px);
}
.continue-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.continue-btn:hover:not(:disabled) { background: #178a65; }
.state-error { color: #c0392b; font-size: 0.9rem; margin-bottom: 0.75rem; }
.state-success { color: #1D9E75; font-size: 0.9rem; font-weight: 500; margin-bottom: 0.75rem; }
</style>
