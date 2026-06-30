<script setup lang="ts">
import type { AvailabilitySlot } from '@/types/reservation';
import { Skeleton } from '@/components/ui/skeleton';

defineProps<{
  formattedDate: string;
  loading: boolean;
  visibleSlots: AvailabilitySlot[];
  selectedDate: string;
  hasUserSelection: boolean;
  reserveStartTime: string;
  reserveEndTime: string;
  isPastSlot: (slot: AvailabilitySlot) => boolean;
  isInSelectedRange: (idx: number) => boolean;
  getCellClass: (slot: AvailabilitySlot, idx: number) => Record<string, boolean>;
}>();

const emit = defineEmits<{
  cellClick: [slot: AvailabilitySlot, idx: number];
  clearSelection: [];
}>();

function statusLabel(slot: AvailabilitySlot): string {
  const labels: Record<string, string> = {
    available: 'Disponível',
    reserved: 'Reservado',
    blocked: 'Bloqueado',
    closed: 'Fechado',
    not_reservable: 'Não reservável',
  };
  return labels[slot.status] ?? slot.status;
}
</script>

<template>
  <section class="room-popup__schedule">
    <div class="schedule-head">
      <span>Disponibilidade · {{ formattedDate }}</span>
      <span class="schedule-hint">toque nas horas livres</span>
    </div>
    <div v-if="loading" class="schedule-skeleton" aria-busy="true" aria-label="Carregando disponibilidade">
      <div class="hour-grid">
        <Skeleton v-for="n in 12" :key="n" class="h-6 flex-1 rounded-[3px]" />
      </div>
      <div class="hour-axis">
        <span v-for="n in 12" :key="n" class="flex justify-center">
          <Skeleton class="h-2 w-2.5 rounded-[2px]" />
        </span>
      </div>
    </div>
    <template v-else-if="visibleSlots.length">
      <!-- :key forces a remount on date change so the stagger re-plays -->
      <div class="hour-grid" :key="selectedDate">
        <button
          v-for="(slot, idx) in visibleSlots" :key="slot.startTime"
          class="hour-cell"
          :class="getCellClass(slot, idx)"
          :style="{ '--cell-i': idx }"
          :disabled="slot.status === 'available' && isPastSlot(slot)"
          :aria-pressed="isInSelectedRange(idx)"
          :aria-label="`${slot.startTime} a ${slot.endTime}: ${statusLabel(slot)}${isPastSlot(slot) ? ' (horário já passou)' : ''}`"
          @click="emit('cellClick', slot, idx)"
        >
          <span v-if="slot.status === 'reserved' || slot.status === 'blocked'" class="dot">●</span>
        </button>
      </div>
      <div class="hour-axis">
        <span v-for="slot in visibleSlots" :key="slot.startTime">
          {{ parseInt(slot.startTime.split(':')[0]) }}
        </span>
      </div>
      <p v-if="hasUserSelection" class="schedule-selection">
        Horário selecionado: <strong>{{ reserveStartTime }}–{{ reserveEndTime }}</strong>
        <button class="schedule-selection__clear" @click="emit('clearSelection')">limpar</button>
      </p>
    </template>
  </section>
</template>

<style scoped>
.room-popup__schedule { margin-bottom: 1rem; }
.schedule-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; color: var(--muted-foreground); letter-spacing: 0.06em; }
.schedule-hint { font-weight: 400; text-transform: none; color: var(--muted-foreground); font-size: 0.62rem; }

.schedule-skeleton { margin-bottom: 3px; }

.hour-grid { display: flex; gap: 2px; margin-bottom: 3px; }

.hour-cell {
  flex: 1; min-width: 0; height: 24px; border: none; border-radius: 3px;
  cursor: pointer; position: relative; padding: 0; background: transparent;
  transition: background var(--duration-fast) ease, transform var(--duration-fast) ease;
  /* Each cell slides up + fades in, staggered left→right, as the popup surges.
     `backwards` holds the hidden start during the delay; no `forwards` so the
     final transform clears and :active press-feedback still works afterwards. */
  animation: cell-rise 0.34s var(--ease-out-quart, cubic-bezier(0.16, 1, 0.3, 1)) backwards;
  animation-delay: calc(var(--cell-i, 0) * 22ms);
}
@keyframes cell-rise {
  from { opacity: 0; transform: translateY(10px) scale(0.92); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.hour-cell:active:not(:disabled) { transform: scaleY(0.85); }

@media (prefers-reduced-motion: reduce) {
  .hour-cell { animation: none; }
}
.hour-cell--green { background: color-mix(in srgb, var(--avail-free) 25%, transparent); }
.hour-cell--green:hover:not(.hour-cell--past) { background: color-mix(in srgb, var(--avail-free) 40%, transparent); }
.hour-cell--red { background: color-mix(in srgb, var(--avail-reserved) 25%, transparent); }
.hour-cell--red:hover { background: color-mix(in srgb, var(--avail-reserved) 40%, transparent); }
.hour-cell--amber { background: color-mix(in srgb, var(--avail-blocked) 30%, transparent); }
.hour-cell--past { opacity: 0.4; }
.hour-cell--past.hour-cell--green { cursor: default; }
.hour-cell--default-selected { background: color-mix(in srgb, var(--avail-free) 45%, transparent); border: 1px dashed var(--avail-free); }
.hour-cell--selected { background: var(--primary); border: 1.5px solid color-mix(in srgb, var(--primary), black 25%); }
.hour-cell--clicked { outline: 2px solid var(--color-link); outline-offset: 1px; }
.hour-cell .dot { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 8px; color: color-mix(in srgb, var(--avail-reserved), black 35%); }

.hour-axis { display: flex; gap: 2px; font-size: 0.6rem; color: var(--muted-foreground); }
.hour-axis span { flex: 1; min-width: 0; text-align: center; }

.schedule-selection { margin: 6px 0 0; font-size: 0.78rem; color: var(--muted-foreground); display: flex; align-items: center; gap: 8px; }
.schedule-selection strong { color: var(--foreground); }
.schedule-selection__clear { border: none; background: none; color: var(--color-link); font-size: 0.74rem; cursor: pointer; padding: 0; text-decoration: underline; }
</style>
