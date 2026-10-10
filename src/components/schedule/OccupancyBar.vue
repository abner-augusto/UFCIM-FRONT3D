<script setup lang="ts">
import { computed } from 'vue';
import type { AvailabilitySlot } from '@/types/reservation';
import { BLOCK_TYPE_LABELS, PURPOSE_LABELS } from '@/types/reservation';
import { busyIntervals, formatTimeLabel, timeToMinutes, type BusyInterval, type TimeRange } from '@/utils/slots';

/**
 * Read-only picture of the day's opening hours (MEL-024): what is already
 * reserved or blocked, the elapsed part of today, and the user's selection on
 * top, followed by a short list of the occupied ranges.
 */
const props = defineProps<{
  /** Open (non-closed) slots of the day, in order. */
  slots: AvailabilitySlot[];
  selection: TimeRange | null;
  /** Minutes since midnight when the day is today; null otherwise. */
  nowMinutes: number | null;
}>();

const dayStart = computed(() => (props.slots.length ? timeToMinutes(props.slots[0].startTime) : 0));
const dayEnd = computed(() =>
  props.slots.length ? timeToMinutes(props.slots[props.slots.length - 1].endTime) : 0,
);
const span = computed(() => Math.max(dayEnd.value - dayStart.value, 1));

function percent(time: string | number): number {
  const minutes = typeof time === 'number' ? time : timeToMinutes(time);
  const clamped = Math.min(Math.max(minutes, dayStart.value), dayEnd.value);
  return ((clamped - dayStart.value) / span.value) * 100;
}

function segmentStyle(range: TimeRange) {
  const left = percent(range.startTime);
  return { left: `${left}%`, width: `${percent(range.endTime) - left}%` };
}

const intervals = computed(() => busyIntervals(props.slots));

const pastWidth = computed(() => (props.nowMinutes === null ? 0 : percent(props.nowMinutes)));

/** Hour marks every 3 hours from opening, plus closing. */
const ticks = computed(() => {
  if (!props.slots.length) return [];
  const first = Math.ceil(dayStart.value / 60);
  const last = Math.floor(dayEnd.value / 60);
  const marks: number[] = [];
  for (let hour = first; hour <= last; hour += 3) marks.push(hour);
  if (marks[marks.length - 1] !== last) {
    // Avoid a cramped final pair (e.g. 19h and 20h): replace the last regular mark.
    if (last - marks[marks.length - 1] < 2 && marks.length > 1) marks.pop();
    marks.push(last);
  }
  return marks.map((hour, index) => ({
    label: formatTimeLabel(`${String(hour).padStart(2, '0')}:00`),
    left: percent(hour * 60),
    align: index === 0 ? 'start' : index === marks.length - 1 ? 'end' : 'center',
  }));
});

function intervalLabel(interval: BusyInterval): string {
  if (interval.status === 'blocked') {
    const type = interval.blocking
      ? (BLOCK_TYPE_LABELS[interval.blocking.blockType as keyof typeof BLOCK_TYPE_LABELS] ?? 'Bloqueio')
      : null;
    const reason = interval.blocking?.reason?.trim();
    if (reason) return `Bloqueado · ${reason}`;
    return type ? `Bloqueado · ${type}` : 'Bloqueado';
  }
  const reservation = interval.reservation;
  const detail = reservation?.description?.trim() || (reservation ? PURPOSE_LABELS[reservation.purpose] : null);
  if (reservation?.isSelf) return detail ? `Sua reserva · ${detail}` : 'Sua reserva';
  return detail ? `Reservado · ${detail}` : 'Reservado';
}
</script>

<template>
  <div class="occupancy">
    <div class="occupancy__bar" aria-hidden="true">
      <span v-if="pastWidth > 0" class="occupancy__past" :style="{ width: `${pastWidth}%` }" />
      <span
        v-for="interval in intervals"
        :key="`${interval.startTime}-${interval.status}`"
        class="occupancy__segment"
        :class="`occupancy__segment--${interval.status}`"
        :style="segmentStyle(interval)"
      />
      <span v-if="selection" class="occupancy__selection" :style="segmentStyle(selection)" />
    </div>
    <div class="occupancy__axis" aria-hidden="true">
      <span
        v-for="tick in ticks"
        :key="tick.label"
        :class="`occupancy__tick--${tick.align}`"
        :style="{ left: `${tick.left}%` }"
      >{{ tick.label }}</span>
    </div>
    <div class="occupancy__legend" aria-hidden="true">
      <span><i class="occupancy__swatch occupancy__swatch--free" />Livre</span>
      <span><i class="occupancy__swatch occupancy__swatch--reserved" />Reservado</span>
      <span><i class="occupancy__swatch occupancy__swatch--blocked" />Bloqueado</span>
      <span><i class="occupancy__swatch occupancy__swatch--selection" />Sua escolha</span>
    </div>

    <ul v-if="intervals.length" class="occupancy__list" aria-label="Horários já ocupados">
      <li v-for="interval in intervals" :key="`${interval.startTime}-${interval.status}`">
        <strong>{{ interval.startTime }}–{{ interval.endTime }}</strong>
        <span>{{ intervalLabel(interval) }}</span>
      </li>
    </ul>
    <p v-else class="occupancy__empty">Nenhuma reserva ou bloqueio neste dia.</p>
  </div>
</template>

<style scoped>
.occupancy {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.occupancy__bar {
  position: relative;
  height: 32px;
  overflow: hidden;
  border-radius: 8px;
  background: color-mix(in srgb, var(--avail-free) 18%, transparent);
}

.occupancy__past {
  position: absolute;
  inset: 0 auto 0 0;
  background: repeating-linear-gradient(
    135deg,
    color-mix(in srgb, var(--muted-foreground) 22%, transparent) 0 4px,
    transparent 4px 8px
  );
}

.occupancy__segment {
  position: absolute;
  top: 0;
  bottom: 0;
}

.occupancy__segment--reserved { background: color-mix(in srgb, var(--avail-reserved) 42%, transparent); }
.occupancy__segment--blocked { background: color-mix(in srgb, var(--avail-blocked) 48%, transparent); }

.occupancy__selection {
  position: absolute;
  top: 6px;
  bottom: 6px;
  border-radius: 4px;
  background: var(--primary);
  box-shadow: 0 0 0 1.5px color-mix(in srgb, var(--primary), black 25%);
}

@media (prefers-reduced-motion: no-preference) {
  .occupancy__selection { transition: left var(--duration-fast, 150ms) ease, width var(--duration-fast, 150ms) ease; }
}

.occupancy__axis {
  position: relative;
  height: 14px;
  color: var(--muted-foreground);
  font-size: 0.66rem;
  font-variant-numeric: tabular-nums;
}

.occupancy__axis span { position: absolute; white-space: nowrap; }
.occupancy__tick--center { transform: translateX(-50%); }
.occupancy__tick--end { transform: translateX(-100%); }

.occupancy__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.75rem;
  color: var(--muted-foreground);
  font-size: 0.72rem;
}

.occupancy__legend span { display: inline-flex; align-items: center; gap: 0.3rem; }

.occupancy__swatch {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.occupancy__swatch--free { background: color-mix(in srgb, var(--avail-free) 30%, transparent); }
.occupancy__swatch--reserved { background: color-mix(in srgb, var(--avail-reserved) 42%, transparent); }
.occupancy__swatch--blocked { background: color-mix(in srgb, var(--avail-blocked) 48%, transparent); }
.occupancy__swatch--selection { background: var(--primary); }

.occupancy__list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin: 0.25rem 0 0;
  padding: 0;
  list-style: none;
  color: var(--muted-foreground);
  font-size: 0.8rem;
}

.occupancy__list li {
  display: flex;
  min-width: 0;
  gap: 0.5rem;
}

.occupancy__list strong {
  flex-shrink: 0;
  color: var(--foreground);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.occupancy__list span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.occupancy__empty {
  margin: 0.25rem 0 0;
  color: var(--muted-foreground);
  font-size: 0.8rem;
}
</style>
