import { computed, ref, watch } from 'vue';
import type { ComputedRef, Ref, WritableComputedRef } from 'vue';
import type { AvailabilitySlot } from '@/types/reservation';
import { findBookableSubRange } from '@/composables/useAvailabilitySelection';
import {
  MIN_DURATION_MINUTES,
  buildEndOptions,
  buildStartOptions,
  minutesToTime,
  timeToMinutes,
  type TimeRange,
} from '@/utils/slots';

export interface TimeRangePickerOptions {
  /** Slots the range is chosen from, in order (half hours). */
  slots: Ref<AvailabilitySlot[]> | ComputedRef<AvailabilitySlot[]>;
  /** Whether a slot may be part of the range (free and not past, for reservations). */
  isBookable: (slot: AvailabilitySlot) => boolean;
}

export interface TimeRangePicker {
  /** `HH:MM` or `''`. Setting a start pre-fills the end with start + 1 hour. */
  start: WritableComputedRef<string>;
  /** `HH:MM` or `''`. Only values in `endOptions` are accepted. */
  end: WritableComputedRef<string>;
  startOptions: ComputedRef<string[]>;
  endOptions: ComputedRef<string[]>;
  /** The chosen range, or null until both ends are set. */
  range: ComputedRef<TimeRange | null>;
  clear: () => void;
  /** Applies `range` trimmed to its first bookable run of at least 1 hour. */
  applyRange: (range: TimeRange) => boolean;
}

/**
 * "Início" / "Término" selection in 30-minute steps (MEL-024). Only valid
 * options are offered: starts with at least 1 hour free ahead, and ends at
 * least 1 hour after the start with no conflict in between.
 */
export function useTimeRangePicker(options: TimeRangePickerOptions): TimeRangePicker {
  const startValue = ref('');
  const endValue = ref('');

  const startOptions = computed(() => buildStartOptions(options.slots.value, options.isBookable));
  const endOptions = computed(() =>
    startValue.value ? buildEndOptions(options.slots.value, startValue.value, options.isBookable) : [],
  );

  function defaultEndFor(ends: string[]): string {
    const oneHourLater = minutesToTime(timeToMinutes(startValue.value) + MIN_DURATION_MINUTES);
    return ends.includes(oneHourLater) ? oneHourLater : (ends[0] ?? '');
  }

  const start = computed<string>({
    get: () => startValue.value,
    set: (value) => {
      if (value && !startOptions.value.includes(value)) return;
      startValue.value = value;
      endValue.value = value ? defaultEndFor(endOptions.value) : '';
    },
  });

  const end = computed<string>({
    get: () => endValue.value,
    set: (value) => {
      if (endOptions.value.includes(value)) endValue.value = value;
    },
  });

  const range = computed<TimeRange | null>(() =>
    startValue.value && endValue.value ? { startTime: startValue.value, endTime: endValue.value } : null,
  );

  function clear() {
    startValue.value = '';
    endValue.value = '';
  }

  function applyRange(target: TimeRange): boolean {
    const slots = options.slots.value;
    const run = findBookableSubRange(slots, target, (slot) => !options.isBookable(slot));
    if (!run) {
      clear();
      return false;
    }
    startValue.value = slots[run.startIdx].startTime;
    endValue.value = slots[run.endIdx].endTime;
    return true;
  }

  // New availability (or a new "now") can invalidate the choice: drop a start
  // that is no longer offered, and pull the end back inside the valid ends.
  watch(
    [startOptions, endOptions],
    ([starts, ends]) => {
      if (startValue.value && !starts.includes(startValue.value)) {
        clear();
        return;
      }
      if (endValue.value && !ends.includes(endValue.value)) {
        const earlier = ends.filter((value) => value < endValue.value);
        endValue.value = earlier[earlier.length - 1] ?? ends[0] ?? '';
      }
    },
    { flush: 'sync' },
  );

  return { start, end, startOptions, endOptions, range, clear, applyRange };
}
