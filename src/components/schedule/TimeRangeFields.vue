<script setup lang="ts">
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { timeToMinutes } from '@/utils/slots';

/**
 * "Início" / "Término" selects in 30-minute steps (MEL-024). The options come
 * from `useTimeRangePicker`, so only valid starts and ends are ever listed.
 */
const props = withDefaults(
  defineProps<{
    idPrefix: string;
    startOptions: string[];
    endOptions: string[];
    disabled?: boolean;
  }>(),
  { disabled: false },
);

const start = defineModel<string>('start', { required: true });
const end = defineModel<string>('end', { required: true });

/** `1h`, `1h30`, `2h` — duration shown next to each end option. */
function durationLabel(endTime: string): string {
  const minutes = timeToMinutes(endTime) - timeToMinutes(start.value);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h${String(rest).padStart(2, '0')}` : `${hours}h`;
}
</script>

<template>
  <div class="time-range-fields">
    <div class="time-range-fields__field">
      <Label :for="`${idPrefix}-start`" class="time-range-fields__label">Início</Label>
      <NativeSelect
        :id="`${idPrefix}-start`"
        v-model="start"
        :disabled="props.disabled || !startOptions.length"
      >
        <NativeSelectOption value="" disabled>
          {{ startOptions.length ? 'Escolha' : 'Sem horário livre' }}
        </NativeSelectOption>
        <NativeSelectOption v-for="time in startOptions" :key="time" :value="time">{{ time }}</NativeSelectOption>
      </NativeSelect>
    </div>
    <div class="time-range-fields__field">
      <Label :for="`${idPrefix}-end`" class="time-range-fields__label">Término</Label>
      <NativeSelect
        :id="`${idPrefix}-end`"
        v-model="end"
        :disabled="props.disabled || !start"
      >
        <NativeSelectOption value="" disabled>—</NativeSelectOption>
        <NativeSelectOption v-for="time in endOptions" :key="time" :value="time">
          {{ time }} ({{ durationLabel(time) }})
        </NativeSelectOption>
      </NativeSelect>
    </div>
    <p class="time-range-fields__summary" aria-live="polite">
      <template v-if="start && end">
        Horário escolhido: <strong>{{ start }}–{{ end }}</strong> · {{ durationLabel(end) }}
      </template>
    </p>
  </div>
</template>

<style scoped>
.time-range-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.time-range-fields__field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.4rem;
}

.time-range-fields__label {
  color: var(--foreground);
  font-size: 0.86rem;
  font-weight: 600;
}

.time-range-fields__summary {
  grid-column: 1 / -1;
  min-height: 1.2em;
  margin: 0;
  color: var(--muted-foreground);
  font-size: 0.82rem;
  font-variant-numeric: tabular-nums;
}

.time-range-fields__summary strong {
  color: var(--foreground);
  font-weight: 600;
}

/* NativeSelect wraps the <select> in a w-fit div: stretch both to the column. */
.time-range-fields__field :deep([data-slot='native-select-wrapper']) {
  width: 100%;
}

.time-range-fields__field :deep(select) {
  height: var(--tap-min, 44px);
  font-size: 1rem; /* 16px: no iOS zoom on focus */
  font-variant-numeric: tabular-nums;
}

@media (min-width: 768px) {
  .time-range-fields__field :deep(select) {
    font-size: 0.95rem;
  }
}
</style>
