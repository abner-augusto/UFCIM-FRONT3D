import { computed, ref, watch } from 'vue';
import type { ComputedRef, Ref } from 'vue';
import type { Availability, AvailabilitySlot } from '@/types/reservation';
import { MIN_DURATION_MINUTES, groupSlotsByHour, timeToMinutes, type HourCell, type TimeRange } from '@/utils/slots';

export interface AvailabilitySelectionOptions {
  availability: Ref<Availability | null>;
  selectedDate: Ref<string> | ComputedRef<string>;
  defaultStartTime?: Ref<string> | ComputedRef<string>;
  defaultEndTime?: Ref<string> | ComputedRef<string>;
}

export interface AvailabilityCellClass extends Record<string, boolean> {
  'hour-cell--green': boolean;
  'hour-cell--red': boolean;
  'hour-cell--amber': boolean;
  'hour-cell--past': boolean;
  'hour-cell--split': boolean;
  'hour-cell--selected': boolean;
  'hour-cell--default-selected': boolean;
  'hour-cell--clicked': boolean;
}

/**
 * Maps a requested schedule range onto the slot grid, trimming to the first
 * contiguous run of bookable slots inside [startTime, endTime) that lasts at
 * least `minMinutes` (1 hour, MEL-024). Returns null when no such run exists.
 * A slot is bookable when its status is 'available' and it is not past
 * (in-progress slots count as bookable — same rule as the backend).
 */
export function findBookableSubRange(
  slots: AvailabilitySlot[],
  range: TimeRange,
  isPast: (slot: AvailabilitySlot) => boolean,
  minMinutes: number = MIN_DURATION_MINUTES,
): { startIdx: number; endIdx: number } | null {
  let startIdx = -1;
  let endIdx = -1;
  const runIsLongEnough = () =>
    startIdx !== -1 &&
    timeToMinutes(slots[endIdx].endTime) - timeToMinutes(slots[startIdx].startTime) >= minMinutes;

  for (let i = 0; i < slots.length; i += 1) {
    const slot = slots[i];
    const inRange = slot.startTime >= range.startTime && slot.endTime <= range.endTime;
    const bookable = inRange && slot.status === 'available' && !isPast(slot);
    const contiguous = endIdx !== -1 && slots[endIdx].endTime === slot.startTime;

    if (bookable && startIdx !== -1 && contiguous) {
      endIdx = i;
      continue;
    }
    // The current run (if any) ends here: keep it when long enough.
    if (runIsLongEnough()) break;
    startIdx = bookable ? i : -1;
    endIdx = bookable ? i : -1;
  }
  return runIsLongEnough() ? { startIdx, endIdx } : null;
}

/**
 * Room-popup selection (viewer and space list). The strip shows one cell per
 * hour; with half-hour availability (MEL-024) a cell may be half occupied. A
 * cell is selectable while any half is bookable, and the chosen hours are
 * trimmed to the first bookable run of at least 1 hour.
 */
export function useAvailabilitySelection(options: AvailabilitySelectionOptions) {
  const { availability, selectedDate, defaultStartTime, defaultEndTime } = options;

  const selectedSlotIndex = ref<number | null>(null);
  const rangeStartIdx = ref<number | null>(null);
  const rangeEndIdx = ref<number | null>(null);
  const nowTs = ref(Date.now());

  /** Non-closed slots as returned by the API (half hours), in order. */
  const openSlots = computed<AvailabilitySlot[]>(() =>
    (availability.value ?? [])
      .filter((slot) => slot.status !== 'closed')
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
  );

  /** One cell per hour for the strip. */
  const visibleSlots = computed<HourCell[]>(() => groupSlotsByHour(openSlots.value));

  const selectedSlot = computed<HourCell | null>(() => {
    if (selectedSlotIndex.value === null) return null;
    return visibleSlots.value[selectedSlotIndex.value] ?? null;
  });

  const hasUserSelection = computed(() => rangeStartIdx.value !== null && rangeEndIdx.value !== null);

  function refreshNow() {
    nowTs.value = Date.now();
  }

  function clearSelection() {
    rangeStartIdx.value = null;
    rangeEndIdx.value = null;
  }

  function clearDetailSelection() {
    selectedSlotIndex.value = null;
  }

  function resetSelection() {
    selectedSlotIndex.value = null;
    clearSelection();
    refreshNow();
  }

  watch(selectedDate, resetSelection);

  function isPastSlot(slot: Pick<AvailabilitySlot, 'endTime'>): boolean {
    return new Date(`${selectedDate.value}T${slot.endTime}:00`).getTime() <= nowTs.value;
  }

  function isHalfBookable(slot: AvailabilitySlot): boolean {
    return slot.status === 'available' && !isPastSlot(slot);
  }

  function isSelectableAt(idx: number): boolean {
    const cell = visibleSlots.value[idx];
    return !!cell && cell.halves.some(isHalfBookable);
  }

  function rangeAllAvailable(a: number, b: number): boolean {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    const cells = visibleSlots.value;
    for (let i = lo; i <= hi; i += 1) {
      if (!isSelectableAt(i)) return false;
      if (i > lo && cells[i - 1].endTime !== cells[i].startTime) return false;
    }
    // Bookable halves must form one run: only the first half of the first
    // hour and the last half of the last hour may be taken.
    const halves = cells.slice(lo, hi + 1).flatMap((cell) => cell.halves);
    const first = halves.findIndex(isHalfBookable);
    const last = halves.length - 1 - [...halves].reverse().findIndex(isHalfBookable);
    return halves.slice(first, last + 1).every(isHalfBookable);
  }

  function isInSelectedRange(idx: number): boolean {
    if (rangeStartIdx.value === null || rangeEndIdx.value === null) return false;
    return idx >= rangeStartIdx.value && idx <= rangeEndIdx.value;
  }

  function selectHour(idx: number) {
    if (!isSelectableAt(idx)) return;

    if (rangeStartIdx.value === null) {
      rangeStartIdx.value = idx;
      rangeEndIdx.value = idx;
      return;
    }

    const single = rangeStartIdx.value === rangeEndIdx.value;
    if (single && idx === rangeStartIdx.value) {
      clearSelection();
      return;
    }

    const startIdx = rangeStartIdx.value;
    if (single && idx !== startIdx && rangeAllAvailable(startIdx, idx)) {
      rangeStartIdx.value = Math.min(startIdx, idx);
      rangeEndIdx.value = Math.max(startIdx, idx);
      return;
    }

    rangeStartIdx.value = idx;
    rangeEndIdx.value = idx;
  }

  function onCellClick(slot: AvailabilitySlot, idx: number) {
    if (slot.status === 'reserved' || slot.status === 'blocked') {
      selectedSlotIndex.value = selectedSlotIndex.value === idx ? null : idx;
      return;
    }

    if (slot.status === 'available') {
      if (!isSelectableAt(idx)) return;
      clearDetailSelection();
      selectHour(idx);
    }
  }

  /** Hours the user picked, before trimming. */
  const pickedRange = computed<TimeRange | null>(() => {
    if (rangeStartIdx.value === null || rangeEndIdx.value === null) return null;
    const first = visibleSlots.value[rangeStartIdx.value];
    const last = visibleSlots.value[rangeEndIdx.value];
    return first && last ? { startTime: first.startTime, endTime: last.endTime } : null;
  });

  function trim(range: TimeRange): TimeRange | null {
    const slots = openSlots.value;
    const run = findBookableSubRange(slots, range, isPastSlot);
    return run ? { startTime: slots[run.startIdx].startTime, endTime: slots[run.endIdx].endTime } : null;
  }

  /** The bookable range (≥ 1 hour) inside the user's pick, or null. */
  const userRange = computed<TimeRange | null>(() => (pickedRange.value ? trim(pickedRange.value) : null));

  const startTime = computed<string | null>(() => userRange.value?.startTime ?? null);
  const endTime = computed<string | null>(() => userRange.value?.endTime ?? null);

  const reserveStartTime = computed(() =>
    hasUserSelection.value
      ? (startTime.value ?? pickedRange.value?.startTime ?? '')
      : (defaultStartTime?.value ?? ''),
  );
  const reserveEndTime = computed(() =>
    hasUserSelection.value
      ? (endTime.value ?? pickedRange.value?.endTime ?? '')
      : (defaultEndTime?.value ?? ''),
  );

  const reserveRangeBookable = computed(() => {
    if (hasUserSelection.value) return userRange.value !== null;
    if (!defaultStartTime || !defaultEndTime) return false;
    return trim({ startTime: defaultStartTime.value, endTime: defaultEndTime.value }) !== null;
  });

  function getCellClass(slot: HourCell, idx: number): AvailabilityCellClass {
    const past = isPastSlot(slot);
    const inUserRange = hasUserSelection.value && isInSelectedRange(idx);
    const isInDefault = !hasUserSelection.value && !past && !!defaultStartTime && !!defaultEndTime
      && slot.endTime > defaultStartTime.value && slot.startTime < defaultEndTime.value;

    return {
      'hour-cell--green': slot.status === 'available',
      'hour-cell--red': slot.status === 'reserved',
      'hour-cell--amber': slot.status === 'blocked',
      'hour-cell--past': past,
      'hour-cell--split': slot.split && !inUserRange,
      'hour-cell--selected': inUserRange && slot.status === 'available' && !past,
      'hour-cell--default-selected': isInDefault && slot.status === 'available',
      'hour-cell--clicked': selectedSlotIndex.value === idx,
    };
  }

  return {
    selectedSlotIndex,
    rangeStartIdx,
    rangeEndIdx,
    nowTs,
    visibleSlots,
    selectedSlot,
    hasUserSelection,
    startTime,
    endTime,
    reserveStartTime,
    reserveEndTime,
    reserveRangeBookable,
    refreshNow,
    clearSelection,
    clearDetailSelection,
    resetSelection,
    isPastSlot,
    isSelectableAt,
    rangeAllAvailable,
    isInSelectedRange,
    selectHour,
    onCellClick,
    getCellClass,
  };
}
