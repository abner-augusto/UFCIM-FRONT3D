<script setup lang="ts">
import { ref } from 'vue';
import type { AvailabilitySlot, TimeSlot } from '@/types/reservation';
import { TIME_SLOT_LABELS, TIME_SLOT_RANGES } from '@/types/reservation';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import TimeRangeFields from '@/components/schedule/TimeRangeFields.vue';
import OccupancyBar from '@/components/schedule/OccupancyBar.vue';

defineProps<{
  loading: boolean;
  startOptions: string[];
  endOptions: string[];
  slots: AvailabilitySlot[];
  range: { startTime: string; endTime: string } | null;
  nowMinutes: number | null;
  available: (slot: TimeSlot) => boolean;
}>();

const mode = defineModel<'slots' | 'hours'>('mode', { required: true });
const slot = defineModel<TimeSlot | null>('slot', { required: true });
const start = defineModel<string>('start', { required: true });
const end = defineModel<string>('end', { required: true });
const root = ref<HTMLElement | null>(null);

function focus() {
  const selector = mode.value === 'hours'
    ? (start.value ? '#reservation-end:not(:disabled)' : '#reservation-start:not(:disabled)')
    : '.slot-btn:not(:disabled)';
  (root.value?.querySelector<HTMLElement>(selector) ?? root.value?.querySelector<HTMLElement>('#reservation-mode'))?.focus();
}
defineExpose({ focus });
</script>

<template>
  <div ref="root" class="form-section">
    <ToggleGroup
      type="single"
      variant="outline"
      class="period-mode-bar"
      :model-value="mode"
      @update:model-value="mode = (($event || 'slots') as 'slots' | 'hours')"
    >
      <ToggleGroupItem id="reservation-mode" value="slots" class="mode-btn">Períodos</ToggleGroupItem>
      <ToggleGroupItem value="hours" class="mode-btn">Horários</ToggleGroupItem>
    </ToggleGroup>
    <div v-if="loading" class="state-msg">Verificando disponibilidade...</div>
    <div v-else-if="mode === 'slots'" class="slot-grid">
      <Button
        v-for="(label, key) in TIME_SLOT_LABELS"
        :key="key"
        type="button"
        variant="outline"
        class="slot-btn"
        :class="{ 'slot-btn--selected': slot === key, 'slot-btn--unavailable': !available(key as TimeSlot) }"
        :disabled="!available(key as TimeSlot)"
        @click="slot = key as TimeSlot"
      >
        {{ label }} ({{ TIME_SLOT_RANGES[key as TimeSlot].startTime }}-{{ TIME_SLOT_RANGES[key as TimeSlot].endTime }})
      </Button>
    </div>
    <div v-else class="hour-picker">
      <p class="hour-picker__hint">Escolha o início e o término. A reserva dura no mínimo 1 hora.</p>
      <TimeRangeFields v-model:start="start" v-model:end="end" id-prefix="reservation" :start-options="startOptions" :end-options="endOptions" />
      <p v-if="!startOptions.length" class="form-hint">Não há 1 hora livre seguida nesta data.</p>
      <OccupancyBar class="hour-picker__bar" :slots="slots" :selection="range" :now-minutes="nowMinutes" />
    </div>
  </div>
</template>

<style scoped>
.form-section { margin-bottom: 1.25rem; }
.form-hint { margin: 0.5rem 0 0; font-size: 0.8rem; color: var(--muted-foreground); }
.state-msg { color: var(--muted-foreground); font-size: 0.9rem; padding: 0.5rem 0; }
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
  border-color: var(--primary);
  background: var(--secondary);
  color: var(--primary);
  font-weight: 600;
}
.slot-btn--unavailable {
  opacity: 0.4;
  cursor: not-allowed;
  background: var(--muted);
}

/* Hour picker */
.hour-picker__hint {
  font-size: 0.8rem;
  color: var(--muted-foreground);
  margin: 0 0 0.6rem;
  min-height: 1.2em;
}
.hour-picker__bar { margin-top: 0.75rem; }

</style>
