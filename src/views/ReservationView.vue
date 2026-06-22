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
import RecurringReservationForm from '@/components/RecurringReservationForm.vue';
import { toLocalISODate } from '@/utils/date';
import AppDateField from '@/components/AppDateField.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

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

const isRecurring = ref(false);

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

</script>

<template>
  <div class="reservation-view">
    <div class="reservation-header">
      <Button variant="ghost" class="back-btn" @click="router.back()">← Voltar</Button>
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
        <Button
          type="button"
          variant="outline"
          class="toggle-label"
          :aria-pressed="isRecurring"
          @click="isRecurring = !isRecurring"
        >
          Reserva recorrente
        </Button>
      </div>

      <!-- ── Non-recurring form ── -->
      <template v-if="!isRecurring">
        <div class="form-section">
          <Label class="form-label" for="reservation-date">Data da reserva</Label>
          <AppDateField id="reservation-date" v-model="selectedDate" :min="today" aria-label="Data da reserva" />
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
          <ToggleGroup
            type="single"
            variant="outline"
            class="period-mode-bar"
            :model-value="selectionMode"
            @update:model-value="selectionMode = (($event || 'slots') as SelectionMode)"
          >
            <ToggleGroupItem value="slots" class="mode-btn">Períodos</ToggleGroupItem>
            <ToggleGroupItem value="hours" class="mode-btn">Horários</ToggleGroupItem>
          </ToggleGroup>

          <div v-if="loadingAvailability" class="state-msg">Verificando disponibilidade...</div>

          <!-- Named slots -->
          <div v-else-if="selectionMode === 'slots'" class="slot-grid">
            <Button
              v-for="(label, slot) in TIME_SLOT_LABELS"
              :key="slot"
              type="button"
              variant="outline"
              class="slot-btn"
              :class="{
                'slot-btn--selected': selectedSlot === slot,
                'slot-btn--unavailable': !checkSlotAvailable(slot as TimeSlot),
              }"
              :disabled="!checkSlotAvailable(slot as TimeSlot)"
              @click="selectedSlot = slot as TimeSlot"
            >
              {{ label }} ({{ TIME_SLOT_RANGES[slot as TimeSlot].startTime }}–{{ TIME_SLOT_RANGES[slot as TimeSlot].endTime }})
            </Button>
          </div>

          <!-- Hour-by-hour picker -->
          <div v-else class="hour-picker">
            <p class="hour-picker__hint">
              {{ customRangeLabel ?? 'Toque em um horário para iniciar a seleção' }}
            </p>
            <div class="hour-grid">
              <Button
                v-for="s in sortedHours"
                :key="s.startTime"
                type="button"
                variant="outline"
                class="hour-btn"
                :class="`hour-btn--${getHourState(s)}`"
                :disabled="!isHourSelectable(s)"
                :aria-label="`${hourLabel(s.startTime)}${isPastTime(s.endTime) ? ' (horário já passou)' : ''}`"
                @click="handleHourClick(s)"
              >
                {{ hourLabel(s.startTime) }}
              </Button>
            </div>
          </div>
        </div>

        <div v-if="selectedSlot || (selectionMode === 'hours' && pickedStart && pickedEnd)" class="form-section">
          <Label class="form-label" for="reservation-purpose">Finalidade</Label>
          <NativeSelect id="reservation-purpose" v-model="selectedPurpose" class="form-input">
            <NativeSelectOption value="" disabled>Selecione uma finalidade</NativeSelectOption>
            <NativeSelectOption v-for="opt in PURPOSE_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </NativeSelectOption>
          </NativeSelect>
        </div>

        <div v-if="selectedSlot || (selectionMode === 'hours' && pickedStart && pickedEnd)" class="form-section">
          <Label class="form-label" for="description-input">Descrição</Label>
          <Input
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
          <Button class="continue-btn" :disabled="!canContinue()" @click="handleContinue">
            Continuar
          </Button>
        </div>
      </template>

      <!-- ── Recurring form ── -->
      <template v-else>
        <RecurringReservationForm :space-id="spaceId" :reservable="space.reservable" />
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
  color: #1D9E75;
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
  margin-bottom: 0.75rem;
  width: 100%;
}
.mode-btn {
  flex: 1;
  min-height: var(--tap-min, 44px);
}

/* Named slots */
.slot-grid { display: flex; flex-direction: column; gap: 0.5rem; }
.slot-btn {
  text-align: left;
  min-height: var(--tap-min, 44px);
  justify-content: flex-start;
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
  font-size: 0.85rem;
  text-align: center;
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
  font-size: 1rem;
  min-height: var(--tap-min, 44px);
}
.continue-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.state-msg   { color: #888; font-size: 0.9rem; padding: 0.5rem 0; }
.state-error { color: #c0392b; font-size: 0.9rem; margin-bottom: 0.75rem; }
.state-success { color: #1D9E75; font-size: 0.9rem; font-weight: 500; margin-bottom: 0.75rem; }
</style>
