<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { toLocalISODate } from '@/utils/date';
import type { Availability } from '@/types/reservation';
import AppDateField from '@/components/AppDateField.vue';
import { Label } from '@/components/ui/label';
import RoomAvailabilityStrip from '@/components/room-popup/RoomAvailabilityStrip.vue';
import { useAvailabilitySelection } from '@/composables/useAvailabilitySelection';

interface ReservationScheduleSelection {
  date: string;
  startTime: string;
  endTime: string;
}

const props = defineProps<{
  campusId: string;
  spaceId: string;
  initialSchedule?: ReservationScheduleSelection | null;
}>();

const emit = defineEmits<{
  scheduleChange: [schedule: ReservationScheduleSelection | null];
}>();

const auth = useAuthStore();
const today = toLocalISODate();
const selectedDate = ref(props.initialSchedule?.date ?? today);
const availability = ref<Availability | null>(null);
const loadingAvailability = ref(false);
const errorMsg = ref<string | null>(null);
let loadSeq = 0;

const {
  visibleSlots,
  hasUserSelection,
  startTime,
  endTime,
  reserveStartTime,
  reserveEndTime,
  clearSelection,
  resetSelection,
  isPastSlot,
  isInSelectedRange,
  onCellClick,
  getCellClass,
  rangeStartIdx,
  rangeEndIdx,
} = useAvailabilitySelection({
  availability,
  selectedDate,
});

const formattedDate = computed(() => {
  const d = new Date(`${selectedDate.value}T00:00:00`);
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', weekday: 'short' });
});

const selectionHint = computed(() => {
  if (hasUserSelection.value) return 'Toque em outro horário livre para ampliar ou reiniciar a seleção.';
  return 'Escolha uma data e toque em um horário livre para selecionar o intervalo.';
});

function emitSchedule() {
  if (!selectedDate.value || !startTime.value || !endTime.value) {
    emit('scheduleChange', null);
    return;
  }

  emit('scheduleChange', {
    date: selectedDate.value,
    startTime: startTime.value,
    endTime: endTime.value,
  });
}

function applyInitialSchedule() {
  const schedule = props.initialSchedule;
  if (!schedule || schedule.date !== selectedDate.value) return;

  const startIdx = visibleSlots.value.findIndex(
    (slot) => slot.startTime === schedule.startTime && slot.status === 'available' && !isPastSlot(slot),
  );
  const endIdx = visibleSlots.value.findIndex(
    (slot) => slot.endTime === schedule.endTime && slot.status === 'available' && !isPastSlot(slot),
  );

  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) return;

  for (let i = startIdx; i <= endIdx; i += 1) {
    const slot = visibleSlots.value[i];
    if (!slot || slot.status !== 'available' || isPastSlot(slot)) return;
  }

  rangeStartIdx.value = startIdx;
  rangeEndIdx.value = endIdx;
}

async function loadAvailability(date: string) {
  const seq = ++loadSeq;
  errorMsg.value = null;
  resetSelection();
  loadingAvailability.value = true;

  try {
    const result = await api.getAvailability(auth.token, props.spaceId, date);
    if (seq !== loadSeq) return;
    availability.value = result;
    applyInitialSchedule();
    emitSchedule();
  } catch {
    if (seq !== loadSeq) return;
    availability.value = null;
    errorMsg.value = 'Não foi possível verificar disponibilidade.';
    emit('scheduleChange', null);
  } finally {
    if (seq === loadSeq) loadingAvailability.value = false;
  }
}

watch(selectedDate, (date) => {
  if (!date) {
    availability.value = null;
    emit('scheduleChange', null);
    return;
  }
  void loadAvailability(date);
}, { immediate: true });

watch(() => props.spaceId, () => {
  void loadAvailability(selectedDate.value);
});

watch([startTime, endTime], emitSchedule);
</script>

<template>
  <section class="reservation-schedule-step" aria-labelledby="reservation-schedule-title">
    <div class="reservation-schedule-step__head">
      <h3 id="reservation-schedule-title">Escolher horário</h3>
      <p>{{ selectionHint }}</p>
    </div>

    <div class="reservation-schedule-step__field">
      <Label class="reservation-schedule-step__label" for="tray-reservation-date">Data da reserva</Label>
      <AppDateField
        id="tray-reservation-date"
        v-model="selectedDate"
        :min="today"
        aria-label="Data da reserva"
      />
    </div>

    <p class="reservation-schedule-step__campus">Campus {{ campusId }}</p>

    <RoomAvailabilityStrip
      :formatted-date="formattedDate"
      :loading="loadingAvailability"
      :visible-slots="visibleSlots"
      :selected-date="selectedDate"
      :has-user-selection="hasUserSelection"
      :reserve-start-time="reserveStartTime"
      :reserve-end-time="reserveEndTime"
      :is-past-slot="isPastSlot"
      :is-in-selected-range="isInSelectedRange"
      :get-cell-class="getCellClass"
      @cell-click="onCellClick"
      @clear-selection="clearSelection"
    />

    <p v-if="errorMsg" class="reservation-schedule-step__error">{{ errorMsg }}</p>
    <p v-else-if="!loadingAvailability && selectedDate && !visibleSlots.length" class="reservation-schedule-step__empty">
      Não há horários operacionais para esta data.
    </p>
  </section>
</template>

<style scoped>
.reservation-schedule-step {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.reservation-schedule-step__head {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.reservation-schedule-step__head h3 {
  margin: 0;
  color: var(--foreground);
  font-size: 1rem;
  font-weight: 700;
}

.reservation-schedule-step__head p,
.reservation-schedule-step__campus,
.reservation-schedule-step__empty {
  margin: 0;
  color: var(--muted-foreground);
  font-size: 0.82rem;
}

.reservation-schedule-step__field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.reservation-schedule-step__label {
  color: var(--foreground);
  font-size: 0.86rem;
  font-weight: 600;
}

.reservation-schedule-step__error {
  margin: 0;
  color: var(--destructive);
  font-size: 0.85rem;
}
</style>
