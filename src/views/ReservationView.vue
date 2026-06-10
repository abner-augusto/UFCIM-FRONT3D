<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Thermometer } from 'lucide-vue-next';
import { useAuthStore } from '@/stores/auth';
import { useReservationStore } from '@/stores/reservation';
import { api } from '@/services/api';
import type { Space } from '@/types/space';
import type { Availability, Blocking, TimeSlot } from '@/types/reservation';
import { BLOCK_TYPE_LABELS, TIME_SLOT_LABELS, TIME_SLOT_RANGES, PURPOSE_OPTIONS, isSlotAvailable } from '@/types/reservation';
import { usePermissions } from '@/composables/usePermissions';
import { useHourRangeSelection } from '@/composables/useHourRangeSelection';
import { toLocalISODate } from '@/utils/date';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const reservationStore = useReservationStore();

const spaceId = route.params.spaceId as string;

const space = ref<Space | null>(null);
const availability = ref<Availability | null>(null);
const today = toLocalISODate();

const selectedDate = ref(today);
const selectedPurpose = ref('');
const loadingSpace = ref(true);
const loadingAvailability = ref(false);
const loadingBlockings = ref(false);
const errorMsg = ref<string | null>(null);
const blockings = ref<Blocking[]>([]);

// ── Selection mode ──────────────────────────────────────────────
type SelectionMode = 'slots' | 'hours';
const selectionMode = ref<SelectionMode>('slots');

// Named-slot mode
const selectedSlot = ref<TimeSlot | null>(null);

// Description for single reservation
const descriptionInput = ref('');

// Recurring reservation state
const isRecurring = ref(false);
const recurringStartDate = ref('');
const recurringEndDate = ref('');
const recurringDayOfWeek = ref<number | null>(null);
const recurringDescription = ref('');
const recurringLoading = ref(false);
const recurringSuccessMsg = ref<string | null>(null);

const { canReserve, canCreateRecurring: canRecurring } = usePermissions();
const {
  pickedStart, pickedEnd, sortedHours, isPastTime, resetPicks,
  isHourSelectable, getHourState, handleHourClick,
  customRangeEnd, customRangeLabel, hourLabel,
} = useHourRangeSelection(availability, selectedDate);

onMounted(async () => {
  if (!canReserve.value) {
    router.replace({ name: 'campus-select' });
    return;
  }
  loadingBlockings.value = true;
  try {
    const [spaceResult, blockingResult] = await Promise.allSettled([
      api.getSpace(auth.token, spaceId),
      api.getBlockings(auth.token, spaceId),
    ]);

    if (spaceResult.status === 'fulfilled') {
      space.value = spaceResult.value;
    } else {
      errorMsg.value = 'Não foi possível carregar os dados do espaço.';
    }

    if (blockingResult.status === 'fulfilled') {
      blockings.value = blockingResult.value;
    }
  } catch {
    errorMsg.value = 'Não foi possível carregar os dados do espaço.';
  } finally {
    loadingBlockings.value = false;
    loadingSpace.value = false;
  }
});

// Prefill the custom hour range from a popup selection (RoomPopup → ViewerView
// stored a custom schedule for this space). Applied once, after availability loads.
let pendingPrefill =
  reservationStore.spaceId === spaceId && reservationStore.date && reservationStore.startTime && reservationStore.endTime
    ? { date: reservationStore.date, startTime: reservationStore.startTime, endTime: reservationStore.endTime }
    : null;

if (pendingPrefill) {
  selectionMode.value = 'hours';
  selectedDate.value = pendingPrefill.date;
}

function applyPendingPrefill() {
  if (!pendingPrefill || pendingPrefill.date !== selectedDate.value || !availability.value) return;
  const { startTime, endTime } = pendingPrefill;
  pendingPrefill = null; // one-shot
  const startSlot = availability.value.find(s => s.startTime === startTime && s.status === 'available');
  const endSlot = availability.value.find(s => s.endTime === endTime && s.status === 'available');
  if (!startSlot || !endSlot) return; // range no longer fully available — leave picker empty
  pickedStart.value = startTime;
  pickedEnd.value = endSlot.startTime; // picker tracks the start time of the last selected hour
}

watch(selectedDate, async (date) => {
  if (!date) return;
  selectedSlot.value = null;
  loadingAvailability.value = true;
  try {
    availability.value = await api.getAvailability(auth.token, spaceId, date);
    applyPendingPrefill();
  } catch {
    errorMsg.value = 'Não foi possível verificar disponibilidade.';
  } finally {
    loadingAvailability.value = false;
  }
}, { immediate: true });

watch(selectionMode, () => {
  selectedSlot.value = null;
  resetPicks();
});

// ── Named-slot helpers ──────────────────────────────────────────
function checkSlotAvailable(slot: TimeSlot): boolean {
  if (!availability.value) return false;
  // A named period is bookable until it fully ends.
  if (isPastTime(TIME_SLOT_RANGES[slot].endTime)) return false;
  return isSlotAvailable(availability.value, slot);
}

function formatBlockingReason(blocking: Blocking): string {
  const typeLabel = BLOCK_TYPE_LABELS[blocking.blockType];
  const reason = blocking.reason?.trim();
  const timeRange = `${blocking.startTime}–${blocking.endTime}`;
  return reason ? `${timeRange} · ${typeLabel}: ${reason}` : `${timeRange} · ${typeLabel}`;
}

const selectedDateBlockings = computed(() => {
  if (!selectedDate.value) return [];
  return blockings.value.filter(
    (blocking) => blocking.status === 'active' && blocking.date === selectedDate.value,
  );
});

const reservationStatusMessage = computed(() => {
  if (space.value?.reservable === false) {
    return 'Este espaço não está disponível para reserva.';
  }
  return null;
});


// ── Can continue? ───────────────────────────────────────────────
function canContinue(): boolean {
  if (space.value?.reservable === false) return false;
  if (!selectedDate.value || !selectedPurpose.value) return false;
  if (selectionMode.value === 'slots') return !!selectedSlot.value;
  return !!(pickedStart.value && pickedEnd.value);
}

function handleContinue() {
  if (!canContinue() || !space.value) return;
  reservationStore.setSpace(spaceId, space.value.name);
  if (selectionMode.value === 'slots') {
    reservationStore.setSchedule(selectedDate.value, selectedSlot.value!);
  } else {
    reservationStore.setCustomSchedule(selectedDate.value, pickedStart.value!, customRangeEnd.value!);
  }
  reservationStore.setPurpose(selectedPurpose.value);
  reservationStore.setDescription(descriptionInput.value);
  router.push({ name: 'reservation-confirm' });
}

// ── Recurring ───────────────────────────────────────────────────
const recurringMinEndDate = computed(() => {
  if (!recurringStartDate.value) return today;
  const d = new Date(recurringStartDate.value + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  return toLocalISODate(d);
});

function canSubmitRecurring() {
  return (
    space.value?.reservable !== false &&
    recurringStartDate.value &&
    recurringEndDate.value &&
    recurringEndDate.value > recurringStartDate.value &&
    recurringDayOfWeek.value !== null &&
    selectedSlot.value &&
    recurringDescription.value.trim()
  );
}

async function handleRecurring() {
  if (!canSubmitRecurring() || !space.value) return;
  const { startTime, endTime } = TIME_SLOT_RANGES[selectedSlot.value!];
  recurringLoading.value = true;
  errorMsg.value = null;
  recurringSuccessMsg.value = null;
  try {
    const result = await api.createRecurringReservation(auth.token, {
      spaceId,
      startDate: recurringStartDate.value,
      endDate: recurringEndDate.value,
      dayOfWeek: recurringDayOfWeek.value!,
      startTime,
      endTime,
      description: recurringDescription.value.trim() || undefined,
    });
    recurringSuccessMsg.value = `${result.created.length} reservas criadas, ${result.skipped.length} conflitos ignorados.`;
    setTimeout(() => router.push({ name: 'my-reservations' }), 2000);
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : 'Não foi possível criar as reservas recorrentes.';
  } finally {
    recurringLoading.value = false;
  }
}
</script>

<template>
  <div class="reservation-view">
    <div class="reservation-header">
      <button class="back-btn" @click="router.back()">← Voltar</button>
      <h1>Fazer Reserva</h1>
    </div>

    <div v-if="loadingSpace" class="state-msg">Carregando espaço...</div>
    <div v-else-if="errorMsg && !space" class="state-error">{{ errorMsg }}</div>

    <div v-else-if="space" class="reservation-form">
      <div class="space-info">
        <h2>{{ space.name }}</h2>
        <p>Bloco {{ space.block }} · {{ space.campus }}</p>
        <p v-if="space.capacity" class="space-capacity">Capacidade: {{ space.capacity }} pessoas</p>
        <p v-if="space.department" class="space-meta">{{ space.department }}</p>
        <p v-if="space.hvac" class="space-meta"><Thermometer :size="14" style="vertical-align: -2px" /> {{ space.hvac }}</p>
        <p v-if="reservationStatusMessage" class="space-warning">{{ reservationStatusMessage }}</p>
      </div>

      <!-- Recurring toggle -->
      <div v-if="canRecurring" class="form-section recurring-toggle-row">
        <label class="toggle-label">
          <input type="checkbox" v-model="isRecurring" />
          Reserva recorrente
        </label>
      </div>

      <!-- ── Non-recurring form ── -->
      <template v-if="!isRecurring">
        <div class="form-section">
          <label class="form-label">Data da reserva</label>
          <input type="date" class="form-input" v-model="selectedDate" :min="today" />
          <p v-if="loadingBlockings && selectedDate" class="form-hint">Verificando bloqueios do dia...</p>
          <div v-else-if="selectedDateBlockings.length" class="blocking-notice">
            <p class="blocking-notice__title">Bloqueios neste dia</p>
            <p
              v-for="blocking in selectedDateBlockings"
              :key="blocking.id"
              class="blocking-notice__item"
            >
              {{ formatBlockingReason(blocking) }}
            </p>
          </div>
        </div>

        <div v-if="selectedDate" class="form-section">
          <div class="period-mode-bar">
            <button
              class="mode-btn"
              :class="{ 'mode-btn--active': selectionMode === 'slots' }"
              @click="selectionMode = 'slots'"
            >Períodos</button>
            <button
              class="mode-btn"
              :class="{ 'mode-btn--active': selectionMode === 'hours' }"
              @click="selectionMode = 'hours'"
            >Horários</button>
          </div>

          <div v-if="loadingAvailability" class="state-msg">Verificando disponibilidade...</div>

          <!-- Named slots -->
          <div v-else-if="selectionMode === 'slots'" class="slot-grid">
            <button
              v-for="(label, slot) in TIME_SLOT_LABELS"
              :key="slot"
              class="slot-btn"
              :class="{
                'slot-btn--selected': selectedSlot === slot,
                'slot-btn--unavailable': !checkSlotAvailable(slot as TimeSlot),
              }"
              :disabled="!checkSlotAvailable(slot as TimeSlot)"
              @click="selectedSlot = slot as TimeSlot"
            >
              {{ label }} ({{ TIME_SLOT_RANGES[slot as TimeSlot].startTime }}–{{ TIME_SLOT_RANGES[slot as TimeSlot].endTime }})
            </button>
          </div>

          <!-- Hour-by-hour picker -->
          <div v-else class="hour-picker">
            <p class="hour-picker__hint">
              {{ customRangeLabel ?? 'Toque em um horário para iniciar a seleção' }}
            </p>
            <div class="hour-grid">
              <button
                v-for="s in sortedHours"
                :key="s.startTime"
                class="hour-btn"
                :class="`hour-btn--${getHourState(s)}`"
                :disabled="!isHourSelectable(s)"
                :aria-label="`${hourLabel(s.startTime)}${isPastTime(s.endTime) ? ' (horário já passou)' : ''}`"
                @click="handleHourClick(s)"
              >
                {{ hourLabel(s.startTime) }}
              </button>
            </div>
          </div>
        </div>

        <div v-if="selectedSlot || (selectionMode === 'hours' && pickedStart && pickedEnd)" class="form-section">
          <label class="form-label">Finalidade</label>
          <select class="form-input" v-model="selectedPurpose">
            <option value="" disabled>Selecione uma finalidade</option>
            <option v-for="opt in PURPOSE_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <div v-if="selectedSlot || (selectionMode === 'hours' && pickedStart && pickedEnd)" class="form-section">
          <label class="form-label" for="description-input">Descrição</label>
          <input
            id="description-input"
            type="text"
            class="form-input"
            maxlength="100"
            v-model="descriptionInput"
            placeholder="Ex: Modelagem Tridimensional"
            aria-describedby="description-hint"
          />
          <p id="description-hint" class="form-hint">opcional · visível a professores · ex: Modelagem Tridimensional</p>
        </div>

        <p v-if="errorMsg" class="state-error">{{ errorMsg }}</p>

        <div class="form-actions">
          <button class="continue-btn" :disabled="!canContinue()" @click="handleContinue">
            Continuar
          </button>
        </div>
      </template>

      <!-- ── Recurring form ── -->
      <template v-else>
        <div class="form-section">
          <label class="form-label">Data de início</label>
          <input type="date" class="form-input" v-model="recurringStartDate" :min="today" />
        </div>

        <div class="form-section">
          <label class="form-label">Data de fim</label>
          <input type="date" class="form-input" v-model="recurringEndDate" :min="recurringMinEndDate" />
        </div>

        <div class="form-section">
          <label class="form-label">Dia da semana</label>
          <select class="form-input" v-model="recurringDayOfWeek">
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
              :class="{ 'slot-btn--selected': selectedSlot === slot }"
              @click="selectedSlot = slot as TimeSlot"
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
            v-model="recurringDescription"
            placeholder="Ex: Aula de Algoritmos — Semestre 2026.1"
          />
        </div>

        <p v-if="recurringSuccessMsg" class="state-success">{{ recurringSuccessMsg }}</p>
        <p v-if="errorMsg" class="state-error">{{ errorMsg }}</p>

        <div class="form-actions">
          <button
            class="continue-btn"
            :disabled="!canSubmitRecurring() || recurringLoading"
            @click="handleRecurring"
          >
            {{ recurringLoading ? 'Agendando...' : 'Agendar Reservas Recorrentes' }}
          </button>
        </div>
      </template>
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
.space-info h2 { margin: 0 0 0.25rem; font-size: 1.1rem; }
.space-info p  { margin: 0; color: #666; font-size: 0.85rem; }
.space-capacity { margin-top: 0.35rem !important; }
.space-warning {
  margin-top: 0.5rem !important;
  color: #b42318 !important;
  font-weight: 600;
}
.recurring-toggle-row { display: flex; align-items: center; }
.toggle-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: #333;
  cursor: pointer;
}
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
.form-hint {
  margin: 0.5rem 0 0;
  font-size: 0.8rem;
  color: #666;
}
.blocking-notice {
  margin-top: 0.5rem;
  padding: 0.75rem;
  border-radius: 8px;
  background: #f8f8f8;
}
.blocking-notice__title {
  margin: 0 0 0.35rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: #555;
}
.blocking-notice__item {
  margin: 0.2rem 0 0;
  font-size: 0.82rem;
  color: #666;
}

/* Mode toggle */
.period-mode-bar {
  display: flex;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 0.75rem;
}
.mode-btn {
  flex: 1;
  padding: 0.5rem;
  border: none;
  background: white;
  font-size: 0.875rem;
  cursor: pointer;
  color: #555;
  transition: background 0.15s, color 0.15s;
  min-height: var(--tap-min, 44px);
}
.mode-btn + .mode-btn { border-left: 1px solid #ddd; }
.mode-btn--active {
  background: #1D9E75;
  color: white;
  font-weight: 600;
}

/* Named slots */
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
.slot-btn--unavailable {
  opacity: 0.4;
  cursor: not-allowed;
  background: #f5f5f5;
}

/* Hour picker */
.hour-picker__hint {
  font-size: 0.8rem;
  color: #888;
  margin: 0 0 0.6rem;
  min-height: 1.2em;
}
.hour-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.4rem;
}
@media (min-width: 481px) {
  .hour-grid {
    grid-template-columns: repeat(6, 1fr);
  }
}

.hour-btn {
  padding: 0.55rem 0;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  font-size: 0.85rem;
  cursor: pointer;
  text-align: center;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
  min-height: var(--tap-min, 44px);
}
.hour-btn--available:hover { border-color: #1D9E75; }
.hour-btn--selected {
  background: #e8f5f0;
  border-color: #1D9E75;
  color: #1D9E75;
}
.hour-btn--endpoint {
  background: #1D9E75;
  border-color: #1D9E75;
  color: white;
  font-weight: 600;
}
.hour-btn--unavailable {
  opacity: 0.35;
  cursor: not-allowed;
  background: #f5f5f5;
}

/* Actions */
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

.state-msg   { color: #888; font-size: 0.9rem; padding: 0.5rem 0; }
.state-error { color: #c0392b; font-size: 0.9rem; margin-bottom: 0.75rem; }
.state-success { color: #1D9E75; font-size: 0.9rem; font-weight: 500; margin-bottom: 0.75rem; }
</style>
