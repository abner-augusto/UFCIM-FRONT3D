<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/services/api';
import { addLocalDays } from '@/utils/date';
import { useCampusToday } from '@/composables/useCampusToday';
import { openingSlots } from '@/utils/slots';
import AppDateField from '@/components/AppDateField.vue';
import TimeRangeFields from '@/components/schedule/TimeRangeFields.vue';
import WeekdayPicker from '@/components/schedule/WeekdayPicker.vue';
import { useTimeRangePicker } from '@/composables/useTimeRangePicker';
import { countRecurringDates } from '@/utils/recurrence';
import { validateRecurringForm } from '@/utils/form-validation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import ReserveOnBehalfFields from '@/components/reservation-tray/ReserveOnBehalfFields.vue';
import { usePermissions } from '@/composables/usePermissions';
import { emptyRequester, requesterPayload, type RequesterSelection } from '@/utils/reservation-requester';
import { isRecurringFormDirty } from '@/utils/reservation-tray-dirty';

const props = defineProps<{
  spaceId: string;
  reservable: boolean | undefined;
  /** The space's closed hours; the opening hours default to 07:00–22:00. */
  closedFrom?: string | null;
  closedTo?: string | null;
}>();

const emit = defineEmits<{
  'state-change': [state: { dirty: boolean; locked: boolean }];
}>();

const router = useRouter();
const auth = useAuthStore();
const { canReserveOnBehalf } = usePermissions();
const today = useCampusToday();
// Staff only (MEL-025): who the series is for, e.g. a professor's semester class.
const requester = ref<RequesterSelection>(emptyRequester());

const startDate = ref('');
const endDate = ref('');
// Up to MAX_WEEKDAYS days in one series, e.g. a class on Monday and Wednesday.
const MAX_WEEKDAYS = 3;
const daysOfWeek = ref<number[]>([]);
const description = ref('');
// "Início" / "Término" in 30-minute steps within opening hours, at least 1 hour
// (MEL-024). Conflicts are checked per occurrence by the backend, which skips them.
const {
  start: seriesStart,
  end: seriesEnd,
  startOptions,
  endOptions,
  range: seriesRange,
} = useTimeRangePicker({
  slots: computed(() => openingSlots(props.closedFrom, props.closedTo)),
  isBookable: () => true,
});
const loading = ref(false);
const successMsg = ref<string | null>(null);
const errorMsg = ref<string | null>(null);

const minEndDate = computed(() => {
  if (!startDate.value) return today.value;
  return addLocalDays(startDate.value, 1);
});

const occurrenceCount = computed(() =>
  endDate.value > startDate.value ? countRecurringDates(startDate.value, endDate.value, daysOfWeek.value) : 0
);

function focusInvalid(field: 'startDate' | 'endDate' | 'weekdays' | 'start' | 'end' | 'description') {
  const ids = { startDate: 'rec-start', endDate: 'rec-end', start: 'rec-time-start', end: 'rec-time-end', description: 'rec-desc' };
  const target = field === 'weekdays'
    ? document.querySelector<HTMLElement>('#rec-weekdays button:not(:disabled)')
    : document.getElementById(ids[field]);
  target?.focus();
}

const submissionBlocked = computed(() => loading.value || !!successMsg.value || props.reservable === false);

const isDirty = computed(() => isRecurringFormDirty({
  startDate: startDate.value,
  endDate: endDate.value,
  daysOfWeek: daysOfWeek.value,
  seriesStart: seriesStart.value,
  seriesEnd: seriesEnd.value,
  description: description.value,
  requester: requester.value,
  successMsg: successMsg.value,
}));

watch(
  [isDirty, loading],
  ([dirty, isLoading]) => emit('state-change', { dirty, locked: isLoading }),
  { immediate: true },
);

async function handleSubmit() {
  if (submissionBlocked.value) return;
  const invalid = validateRecurringForm({
    startDate: startDate.value,
    endDate: endDate.value,
    occurrences: occurrenceCount.value,
    start: seriesStart.value,
    hasRange: !!seriesRange.value,
    description: description.value,
  });
  if (invalid) {
    errorMsg.value = invalid.message;
    focusInvalid(invalid.field);
    return;
  }
  if (!seriesRange.value) return;
  const { startTime, endTime } = seriesRange.value;
  loading.value = true;
  errorMsg.value = null;
  successMsg.value = null;
  try {
    const result = await api.createRecurringReservation(auth.token, {
      spaceId: props.spaceId,
      startDate: startDate.value,
      endDate: endDate.value,
      daysOfWeek: daysOfWeek.value,
      startTime,
      endTime,
      description: description.value.trim(),
      ...requesterPayload(canReserveOnBehalf.value ? requester.value : null),
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
  <form novalidate @submit.prevent="handleSubmit">
    <div class="mb-5">
      <Label class="mb-2 block text-sm font-semibold" id="rec-start-label" for="rec-start">Data de início</Label>
      <AppDateField id="rec-start" label-id="rec-start-label" v-model="startDate" :min="today" />
    </div>

    <div class="mb-5">
      <Label class="mb-2 block text-sm font-semibold" id="rec-end-label" for="rec-end">Data de fim</Label>
      <AppDateField id="rec-end" label-id="rec-end-label" v-model="endDate" :min="minEndDate" />
    </div>

    <div class="mb-5">
      <p id="rec-dow-label" tabindex="-1" class="mb-2 text-sm font-semibold">Dias da semana</p>
      <WeekdayPicker id="rec-weekdays" v-model="daysOfWeek" :max="MAX_WEEKDAYS" aria-labelledby="rec-dow-label" />
      <p class="text-muted-foreground mt-2 text-xs" aria-live="polite">
        {{ daysOfWeek.length < MAX_WEEKDAYS
          ? `Escolha até ${MAX_WEEKDAYS} dias.`
          : `Limite de ${MAX_WEEKDAYS} dias atingido. Desmarque um para trocar.` }}
        <template v-if="occurrenceCount > 0">
          {{ occurrenceCount === 1 ? ' 1 data no período.' : ` ${occurrenceCount} datas no período.` }}
        </template>
      </p>
    </div>

    <fieldset class="mb-5">
      <legend class="mb-2 block text-sm font-semibold">Horário</legend>
      <TimeRangeFields
        v-model:start="seriesStart"
        v-model:end="seriesEnd"
        id-prefix="rec-time"
        :start-options="startOptions"
        :end-options="endOptions"
      />
      <p class="text-muted-foreground mt-2 text-xs">Cada reserva da série dura no mínimo 1 hora.</p>
    </fieldset>

    <div class="mb-5">
      <Label class="mb-2 block text-sm font-semibold" for="rec-desc">Descrição da recorrência *</Label>
      <Input
        id="rec-desc"
        required
        v-model="description"
        class="h-11"
        type="text"
        placeholder="Ex: Aula de Algoritmos — Semestre 2026.1"
      />
    </div>

    <ReserveOnBehalfFields
      v-if="canReserveOnBehalf"
      v-model="requester"
      id-prefix="rec-requester"
      class="mb-5"
    />

    <p v-if="successMsg" class="text-primary mb-3 text-sm font-medium" role="status" aria-live="polite">{{ successMsg }}</p>
    <p v-if="errorMsg" class="text-destructive mb-3 text-sm" role="alert">{{ errorMsg }}</p>

    <div class="form-actions">
      <Button
        class="h-11 w-full"
        type="submit"
        :disabled="submissionBlocked"
      >
        {{ loading ? 'Agendando...' : 'Agendar Reservas Recorrentes' }}
      </Button>
    </div>
  </form>
</template>

<style scoped>
.form-actions {
  margin-top: 1rem;
}
@media (max-width: 767px) {
  .form-actions {
    position: sticky;
    bottom: calc(var(--bottom-bar-h, 0px) + var(--safe-bottom, 0px));
    background: var(--background);
    padding: 0.75rem 0 calc(0.5rem + var(--safe-bottom, 0px));
    z-index: 5;
    box-shadow: 0 -4px 12px rgb(var(--shadow-color) / 0.06);
    margin-left: -1rem;
    margin-right: -1rem;
    padding-left: 1rem;
    padding-right: 1rem;
  }
}
</style>
