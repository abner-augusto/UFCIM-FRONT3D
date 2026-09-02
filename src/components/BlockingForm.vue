<script setup lang="ts">
import { computed, ref } from 'vue';
import { BLOCK_TYPE_LABELS } from '@/types/reservation';
import type { ActionStatus } from '@/components/StatefulActionButton.vue';
import AppDateField from '@/components/AppDateField.vue';
import StatefulActionButton from '@/components/StatefulActionButton.vue';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { toLocalISODate } from '@/utils/date';

type BlockType = 'maintenance' | 'administrative';
type HourMode = 'full_day' | 'custom';

export interface BlockingPayload {
  date: string;
  startTime: string;
  endTime: string;
  blockType: BlockType;
  reason: string;
}

const props = withDefaults(
  defineProps<{
    status: ActionStatus;
    error?: string | null;
    initialDate?: string;
  }>(),
  { error: null, initialDate: '' },
);

const emit = defineEmits<{
  submit: [payload: BlockingPayload];
}>();

const selectedDate = ref(props.initialDate);
const selectedBlockType = ref<BlockType | ''>('');
const reason = ref('');
const hourMode = ref<HourMode>('full_day');
const pickedStart = ref<string | null>(null);
const pickedEnd = ref<string | null>(null);

const today = toLocalISODate();
const ALL_HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = String(i).padStart(2, '0');
  return { startTime: `${h}:00`, endTime: `${String(i + 1).padStart(2, '0')}:00` };
});

const resolvedStart = computed(() => {
  if (hourMode.value === 'full_day') return '00:00';
  return pickedStart.value;
});

const resolvedEnd = computed(() => {
  if (hourMode.value === 'full_day') return '24:00';
  if (pickedEnd.value) {
    const slot = ALL_HOURS.find((hour) => hour.startTime === pickedEnd.value);
    return slot?.endTime ?? pickedEnd.value;
  }
  if (pickedStart.value) {
    const slot = ALL_HOURS.find((hour) => hour.startTime === pickedStart.value);
    return slot?.endTime ?? null;
  }
  return null;
});

const canSubmit = computed(() =>
  !!selectedDate.value &&
  !!selectedBlockType.value &&
  resolvedStart.value !== null &&
  resolvedEnd.value !== null &&
  resolvedStart.value < resolvedEnd.value,
);

function handleHourClick(hour: string) {
  if (!pickedStart.value) {
    pickedStart.value = hour;
    pickedEnd.value = null;
    return;
  }
  if (hour === pickedStart.value && !pickedEnd.value) {
    pickedStart.value = null;
    return;
  }
  if (pickedEnd.value) {
    pickedStart.value = hour;
    pickedEnd.value = null;
    return;
  }
  const [low, high] = hour > pickedStart.value
    ? [pickedStart.value, hour]
    : [hour, pickedStart.value];
  pickedStart.value = low;
  pickedEnd.value = high;
}

function getHourState(hour: string): 'available' | 'selected' | 'endpoint' {
  if (!pickedStart.value) return 'available';
  if (hour === pickedStart.value || hour === pickedEnd.value) return 'endpoint';
  if (pickedEnd.value && hour > pickedStart.value && hour < pickedEnd.value) return 'selected';
  return 'available';
}

function handleModeChange(value: unknown) {
  hourMode.value = (typeof value === 'string' ? value : 'full_day') as HourMode;
  if (hourMode.value === 'full_day') {
    pickedStart.value = null;
    pickedEnd.value = null;
  }
}

function handleSubmit() {
  if (!canSubmit.value || !selectedBlockType.value || !resolvedStart.value || !resolvedEnd.value) return;
  emit('submit', {
    date: selectedDate.value,
    startTime: resolvedStart.value,
    endTime: resolvedEnd.value,
    blockType: selectedBlockType.value,
    reason: reason.value.trim(),
  });
}
</script>

<template>
  <div class="blocking-form">
    <div class="form-section">
      <Label class="form-label" for="blocking-date">Data</Label>
      <AppDateField id="blocking-date" v-model="selectedDate" :min="today" aria-label="Data do bloqueio" />
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

      <div v-if="hourMode === 'custom'" class="hour-grid">
        <Button
          v-for="slot in ALL_HOURS"
          :key="slot.startTime"
          type="button"
          variant="outline"
          class="hour-btn"
          :class="{
            'hour-btn--endpoint': getHourState(slot.startTime) === 'endpoint',
            'hour-btn--selected': getHourState(slot.startTime) === 'selected',
          }"
          @click="handleHourClick(slot.startTime)"
        >
          {{ slot.startTime.replace(':00', 'h') }}
        </Button>
      </div>

      <p v-if="resolvedStart && resolvedEnd" class="period-summary">
        {{ hourMode === 'full_day'
            ? 'Bloqueio para o dia inteiro (00:00 – 24:00)'
            : `${resolvedStart} – ${resolvedEnd}` }}
      </p>
    </div>

    <div class="form-section">
      <Label class="form-label" for="blocking-type">Tipo de bloqueio</Label>
      <NativeSelect id="blocking-type" v-model="selectedBlockType" class="form-input">
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
.form-label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--foreground);
  font-size: 0.9rem;
  font-weight: 600;
}
.optional { color: var(--muted-foreground); font-weight: 400; }
.form-input { width: 100%; min-height: var(--tap-min, 44px); }
.form-textarea { min-height: var(--tap-min, 44px); resize: vertical; font-family: inherit; }
.hour-mode-toggle { display: flex; gap: 0.5rem; width: 100%; margin-bottom: 0.75rem; }
.mode-btn { flex: 1; min-height: var(--tap-min, 44px); }
.hour-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.4rem; margin-bottom: 0.75rem; }
.hour-btn {
  min-height: var(--tap-min, 44px);
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--background);
  color: var(--foreground);
  cursor: pointer;
  font-size: 0.8rem;
  text-align: center;
}
.hour-btn:hover { border-color: var(--primary); }
.hour-btn--endpoint { background: var(--primary); border-color: var(--primary); color: var(--primary-foreground); font-weight: 600; }
.hour-btn--selected { background: var(--secondary); border-color: var(--primary); }
.period-summary { margin: 0.25rem 0 0; color: var(--muted-foreground); font-size: 0.85rem; }
.form-actions { margin-top: 1rem; }
.state-error { margin-bottom: 0.75rem; color: var(--destructive); font-size: 0.9rem; }

@media (min-width: 481px) { .hour-grid { grid-template-columns: repeat(6, 1fr); } }
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
