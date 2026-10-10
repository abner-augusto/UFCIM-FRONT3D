<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue';
import { BLOCK_TYPE_LABELS } from '@/types/reservation';
import type { ActionStatus } from '@/components/StatefulActionButton.vue';
import AppDateField from '@/components/AppDateField.vue';
import StatefulActionButton from '@/components/StatefulActionButton.vue';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import TimeRangeFields from '@/components/schedule/TimeRangeFields.vue';
import { useTimeRangePicker } from '@/composables/useTimeRangePicker';
import { addLocalDays, formatDateShort, toLocalISODate } from '@/utils/date';
import { buildOpenSlots } from '@/utils/slots';

type BlockType = 'maintenance' | 'administrative';
type HourMode = 'full_day' | 'custom';

export interface BlockingPayload {
  /** Inclusive date range (MEL-017); single-day blocks use dateFrom === dateTo. */
  dateFrom: string;
  dateTo: string;
  startTime: string;
  endTime: string;
  blockType: BlockType;
  reason: string;
}

const props = withDefaults(
  defineProps<{
    status: ActionStatus;
    error?: string | null;
    /** Default for the "De" field; "Até" starts on the same day. */
    initialDate?: string;
    /**
     * When set, the type selector is hidden and this value is used for submit.
     * The maintenance profile always blocks as 'maintenance' (MEL-016); the
     * backend enforces the same rule.
     */
    forcedBlockType?: BlockType | null;
    /** Pre-fills the free-text reason (e.g. started from a maintenance ticket). */
    initialReason?: string;
    /** Pre-selects the type when the caller has context for it. */
    initialBlockType?: BlockType | '';
  }>(),
  { error: null, initialDate: '', forcedBlockType: null, initialReason: '', initialBlockType: '' },
);

const emit = defineEmits<{
  submit: [payload: BlockingPayload];
}>();

const selectedDateFrom = ref(props.initialDate);
const selectedDateTo = ref(props.initialDate);
const selectedBlockType = ref<BlockType | ''>(props.initialBlockType);
const effectiveBlockType = computed<BlockType | ''>(
  () => props.forcedBlockType ?? selectedBlockType.value,
);
const reason = ref(props.initialReason);
const hourMode = ref<HourMode>('full_day');

// Custom hours: "Início" / "Término" in 30-minute steps over the whole day,
// at least 1 hour long (MEL-024). A blocking overrides reservations, so every
// slot is eligible.
const {
  start: customStart,
  end: customEnd,
  startOptions,
  endOptions,
  range: customRange,
  clear: clearCustomRange,
} = useTimeRangePicker({ slots: shallowRef(buildOpenSlots('00:00', '24:00')), isBookable: () => true });

const today = toLocalISODate();
/** Backend caps a single operation at 60 inclusive days (MEL-017). */
const MAX_RANGE_DAYS = 60;
const maxDateTo = computed(() =>
  selectedDateFrom.value ? addLocalDays(selectedDateFrom.value, MAX_RANGE_DAYS - 1) : undefined,
);
const rangeDays = computed(() => {
  if (!selectedDateFrom.value || !selectedDateTo.value) return 0;
  const from = Date.parse(`${selectedDateFrom.value}T00:00:00Z`);
  const to = Date.parse(`${selectedDateTo.value}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to) || to < from) return 0;
  return Math.round((to - from) / 86_400_000) + 1;
});
const rangeSummary = computed(() => {
  if (rangeDays.value === 0) return '';
  if (rangeDays.value === 1) return formatDateShort(selectedDateFrom.value);
  return `${rangeDays.value} dias (${formatDateShort(selectedDateFrom.value)} – ${formatDateShort(selectedDateTo.value)})`;
});
const resolvedStart = computed(() => {
  if (hourMode.value === 'full_day') return '00:00';
  return customRange.value?.startTime ?? null;
});
const resolvedEnd = computed(() => {
  if (hourMode.value === 'full_day') return '24:00';
  return customRange.value?.endTime ?? null;
});

const canSubmit = computed(() =>
  rangeDays.value > 0 &&
  !!effectiveBlockType.value &&
  resolvedStart.value !== null &&
  resolvedEnd.value !== null &&
  resolvedStart.value < resolvedEnd.value,
);

// Keep "Até" coherent with "De": never before it, never empty.
watch(selectedDateFrom, (from) => {
  if (!selectedDateTo.value || selectedDateTo.value < from) selectedDateTo.value = from;
});

function handleModeChange(value: unknown) {
  hourMode.value = (typeof value === 'string' ? value : 'full_day') as HourMode;
  if (hourMode.value === 'full_day') clearCustomRange();
}

function handleSubmit() {
  if (!canSubmit.value || !effectiveBlockType.value || !resolvedStart.value || !resolvedEnd.value) return;
  emit('submit', {
    dateFrom: selectedDateFrom.value,
    dateTo: selectedDateTo.value,
    startTime: resolvedStart.value,
    endTime: resolvedEnd.value,
    blockType: effectiveBlockType.value,
    reason: reason.value.trim(),
  });
}
</script>

<template>
  <div class="blocking-form">
    <div class="form-section">
      <div class="date-range">
        <div>
          <Label class="form-label" for="blocking-date-from">De</Label>
          <AppDateField
            id="blocking-date-from"
            v-model="selectedDateFrom"
            :min="today"
            aria-label="Data inicial do bloqueio"
          />
        </div>
        <div>
          <Label class="form-label" for="blocking-date-to">Até</Label>
          <AppDateField
            id="blocking-date-to"
            v-model="selectedDateTo"
            :min="selectedDateFrom || today"
            :max="maxDateTo"
            aria-label="Data final do bloqueio"
          />
        </div>
      </div>
      <p v-if="rangeDays > 1" class="period-summary">{{ rangeSummary }}</p>
    </div>

    <div class="form-section">
      <Label class="form-label">Período</Label>
      <ToggleGroup
        type="single"
        variant="outline"
        class="hour-mode-toggle"
        :model-value="hourMode"
        @update:model-value="handleModeChange"
      >
        <ToggleGroupItem value="full_day" class="mode-btn">Dia inteiro</ToggleGroupItem>
        <ToggleGroupItem value="custom" class="mode-btn">Horário personalizado</ToggleGroupItem>
      </ToggleGroup>

      <TimeRangeFields
        v-if="hourMode === 'custom'"
        v-model:start="customStart"
        v-model:end="customEnd"
        class="custom-hours"
        id-prefix="blocking"
        :start-options="startOptions"
        :end-options="endOptions"
      />

      <p v-if="hourMode === 'full_day'" class="period-summary">
        Bloqueio para o dia inteiro (00:00 – 24:00)
      </p>
      <p v-else class="period-summary">O bloqueio dura no mínimo 1 hora.</p>
    </div>

    <div class="form-section">
      <Label class="form-label" for="blocking-type">Tipo de bloqueio</Label>
      <p v-if="forcedBlockType" class="form-static-value">Manutenção</p>
      <NativeSelect v-else id="blocking-type" v-model="selectedBlockType" class="form-input">
        <NativeSelectOption value="" disabled>Selecione um tipo</NativeSelectOption>
        <NativeSelectOption v-for="(label, type) in BLOCK_TYPE_LABELS" :key="type" :value="type">
          {{ label }}
        </NativeSelectOption>
      </NativeSelect>
    </div>

    <div class="form-section">
      <Label class="form-label" for="blocking-reason">Motivo <span class="optional">(opcional)</span></Label>
      <Textarea
        id="blocking-reason"
        class="form-input form-textarea"
        v-model="reason"
        placeholder="Descreva o motivo do bloqueio..."
        rows="3"
      />
    </div>

    <p v-if="error" class="state-error" role="alert" aria-live="polite">{{ error }}</p>

    <div class="form-actions">
      <StatefulActionButton
        :status="status"
        :disabled="!canSubmit"
        idle-label="Bloquear Espaço"
        submitting-label="Bloqueando..."
        success-label="Espaço bloqueado com sucesso!"
        error-label="Tentar novamente"
        @click="handleSubmit"
      />
    </div>
  </div>
</template>

<style scoped>
.form-section { margin-bottom: 1.25rem; }
.date-range { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; }
.form-label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--foreground);
  font-size: 0.9rem;
  font-weight: 600;
}
.optional { color: var(--muted-foreground); font-weight: 400; }
.form-input { width: 100%; min-height: var(--tap-min, 44px); }
.form-static-value {
  display: flex;
  align-items: center;
  margin: 0;
  padding: 0 0.75rem;
  min-height: var(--tap-min, 44px);
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--muted);
  color: var(--foreground);
  font-size: 0.9rem;
}
.form-textarea { min-height: var(--tap-min, 44px); resize: vertical; font-family: inherit; }
.hour-mode-toggle { display: flex; gap: 0.5rem; width: 100%; margin-bottom: 0.75rem; }
.mode-btn { flex: 1; min-height: var(--tap-min, 44px); }
.custom-hours { margin-bottom: 0.5rem; }
.period-summary { margin: 0.25rem 0 0; color: var(--muted-foreground); font-size: 0.85rem; }
.form-actions { margin-top: 1rem; }
.state-error { margin-bottom: 0.75rem; color: var(--destructive); font-size: 0.9rem; }

@media (max-width: 767px) {
  .form-actions {
    position: sticky;
    bottom: calc(var(--bottom-bar-h, 0px) + var(--safe-bottom, 0px));
    z-index: 5;
    margin-right: -1rem;
    margin-left: -1rem;
    padding: 0.75rem 1rem calc(0.5rem + var(--safe-bottom, 0px));
    background: var(--background);
    box-shadow: 0 -4px 12px rgb(var(--shadow-color) / 0.06);
  }
}
</style>
