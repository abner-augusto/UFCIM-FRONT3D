<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { toLocalISODate } from '@/utils/date';
import type { Availability, AvailabilitySlot } from '@/types/reservation';
import AppDateField from '@/components/AppDateField.vue';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import TimeRangeFields from '@/components/schedule/TimeRangeFields.vue';
import OccupancyBar from '@/components/schedule/OccupancyBar.vue';
import { useTimeRangePicker } from '@/composables/useTimeRangePicker';
import { campusLabel } from '@/utils/space-labels';
import { freeOwnReservation } from '@/utils/reservation-edit';

interface ReservationScheduleSelection {
  date: string;
  startTime: string;
  endTime: string;
}

const props = defineProps<{
  campusId: string;
  spaceId: string;
  initialSchedule?: ReservationScheduleSelection | null;
  /** Edit mode (MEL-023): this reservation's own interval counts as free. */
  excludeReservationId?: string | null;
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
const nowTs = ref(Date.now());
let loadSeq = 0;

/** The day's open slots (half hours), in order. */
const openSlots = computed<AvailabilitySlot[]>(() =>
  freeOwnReservation(availability.value ?? [], props.excludeReservationId)
    .filter((slot) => slot.status !== 'closed')
    .sort((a, b) => a.startTime.localeCompare(b.startTime)),
);

/** A slot is past once it ends: the in-progress half hour stays bookable (same rule as the backend). */
function isPastSlot(slot: AvailabilitySlot): boolean {
  return new Date(`${selectedDate.value}T${slot.endTime}:00`).getTime() <= nowTs.value;
}

const { start, end, startOptions, endOptions, range, clear, applyRange } = useTimeRangePicker({
  slots: openSlots,
  isBookable: (slot) => slot.status === 'available' && !isPastSlot(slot),
});

const nowMinutes = computed(() => {
  if (selectedDate.value !== today) return null;
  const now = new Date(nowTs.value);
  return now.getHours() * 60 + now.getMinutes();
});

function emitSchedule() {
  if (!selectedDate.value || !range.value) {
    emit('scheduleChange', null);
    return;
  }

  emit('scheduleChange', {
    date: selectedDate.value,
    startTime: range.value.startTime,
    endTime: range.value.endTime,
  });
}

function applyInitialSchedule(schedule: ReservationScheduleSelection | null | undefined) {
  if (!schedule || schedule.date !== selectedDate.value) return;
  // Trimmed to the first free range of at least 1 hour; empty when none is left.
  applyRange(schedule);
}

async function loadAvailability(date: string) {
  const seq = ++loadSeq;
  const initialSchedule = props.initialSchedule;
  errorMsg.value = null;
  clear();
  nowTs.value = Date.now();
  loadingAvailability.value = true;

  try {
    const result = await api.getAvailability(auth.token, props.spaceId, date);
    if (seq !== loadSeq) return;
    availability.value = result;
    applyInitialSchedule(initialSchedule);
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

watch([() => props.spaceId, () => props.initialSchedule], () => {
  const initialDate = props.initialSchedule?.date ?? today;
  if (selectedDate.value === initialDate) {
    void loadAvailability(initialDate);
  } else {
    selectedDate.value = initialDate;
  }
});

watch(range, emitSchedule);

onUnmounted(() => {
  loadSeq += 1;
});
</script>

<template>
  <section class="reservation-schedule-step" aria-labelledby="reservation-schedule-title">
    <div class="reservation-schedule-step__head">
      <h3 id="reservation-schedule-title">Escolher horário</h3>
      <p>Escolha o início e o término. A reserva dura no mínimo 1 hora.</p>
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

    <p class="reservation-schedule-step__campus">Campus {{ campusLabel(campusId) }}</p>

    <div v-if="loadingAvailability" class="reservation-schedule-step__loading" aria-busy="true" aria-label="Carregando disponibilidade">
      <div class="reservation-schedule-step__loading-fields">
        <Skeleton class="h-11 rounded-lg" />
        <Skeleton class="h-11 rounded-lg" />
      </div>
      <Skeleton class="h-8 rounded-lg" />
    </div>

    <template v-else-if="openSlots.length">
      <TimeRangeFields
        v-model:start="start"
        v-model:end="end"
        id-prefix="tray-reservation"
        :start-options="startOptions"
        :end-options="endOptions"
      />
      <p v-if="!startOptions.length" class="reservation-schedule-step__empty">
        Não há 1 hora livre seguida nesta data. Escolha outro dia.
      </p>
      <OccupancyBar :slots="openSlots" :selection="range" :now-minutes="nowMinutes" />
    </template>

    <p v-if="errorMsg" class="reservation-schedule-step__error">{{ errorMsg }}</p>
    <p v-else-if="!loadingAvailability && selectedDate && !openSlots.length" class="reservation-schedule-step__empty">
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

.reservation-schedule-step__loading {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.reservation-schedule-step__loading-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.reservation-schedule-step__error {
  margin: 0;
  color: var(--destructive);
  font-size: 0.85rem;
}
</style>
