<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/services/api';
import { toLocalISODate } from '@/utils/date';
import { openingSlots } from '@/utils/slots';
import AppDateField from '@/components/AppDateField.vue';
import TimeRangeFields from '@/components/schedule/TimeRangeFields.vue';
import { useTimeRangePicker } from '@/composables/useTimeRangePicker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';

const props = defineProps<{
  spaceId: string;
  reservable: boolean | undefined;
  /** The space's closed hours; the opening hours default to 07:00–22:00. */
  closedFrom?: string | null;
  closedTo?: string | null;
}>();

const router = useRouter();
const auth = useAuthStore();
const today = toLocalISODate();

const startDate = ref('');
const endDate = ref('');
const dayOfWeek = ref<number | null>(null);
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
    seriesRange.value &&
    description.value.trim()
  );
}

async function handleSubmit() {
  if (!canSubmit() || !seriesRange.value) return;
  const { startTime, endTime } = seriesRange.value;
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
    <div class="mb-5">
      <Label class="mb-2 block text-sm font-semibold" for="rec-start">Data de início</Label>
      <AppDateField id="rec-start" v-model="startDate" :min="today" aria-label="Data de início" />
    </div>

    <div class="mb-5">
      <Label class="mb-2 block text-sm font-semibold" for="rec-end">Data de fim</Label>
      <AppDateField id="rec-end" v-model="endDate" :min="minEndDate" aria-label="Data de fim" />
    </div>

    <div class="mb-5">
      <Label class="mb-2 block text-sm font-semibold" for="rec-dow">Dia da semana</Label>
      <NativeSelect
        id="rec-dow"
        class="h-11 w-full"
        :model-value="dayOfWeek ?? ''"
        @update:model-value="dayOfWeek = $event === '' ? null : Number($event)"
      >
        <NativeSelectOption value="" disabled>Selecione um dia</NativeSelectOption>
        <NativeSelectOption value="1">Segunda-feira</NativeSelectOption>
        <NativeSelectOption value="2">Terça-feira</NativeSelectOption>
        <NativeSelectOption value="3">Quarta-feira</NativeSelectOption>
        <NativeSelectOption value="4">Quinta-feira</NativeSelectOption>
        <NativeSelectOption value="5">Sexta-feira</NativeSelectOption>
        <NativeSelectOption value="6">Sábado</NativeSelectOption>
        <NativeSelectOption value="0">Domingo</NativeSelectOption>
      </NativeSelect>
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
      <Label class="mb-2 block text-sm font-semibold" for="rec-desc">Descrição da recorrência</Label>
      <Input
        id="rec-desc"
        v-model="description"
        class="h-11"
        type="text"
        placeholder="Ex: Aula de Algoritmos — Semestre 2026.1"
      />
    </div>

    <p v-if="successMsg" class="text-primary mb-3 text-sm font-medium" role="status" aria-live="polite">{{ successMsg }}</p>
    <p v-if="errorMsg" class="text-destructive mb-3 text-sm" role="alert" aria-live="polite">{{ errorMsg }}</p>

    <div class="form-actions">
      <Button
        class="h-11 w-full"
        :disabled="!canSubmit() || loading"
        @click="handleSubmit"
      >
        {{ loading ? 'Agendando...' : 'Agendar Reservas Recorrentes' }}
      </Button>
    </div>
  </div>
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
