import { computed, ref, watch } from 'vue';
import type { ComputedRef, Ref } from 'vue';
import type { Availability, AvailabilitySlot } from '@/types/reservation';

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
  'hour-cell--selected': boolean;
  'hour-cell--default-selected': boolean;
  'hour-cell--clicked': boolean;
}

export function availabilityHourLabel(time: string): string {
  return time.replace(':00', 'h');
}

export function useAvailabilitySelection(options: AvailabilitySelectionOptions) {
  const { availability, selectedDate, defaultStartTime, defaultEndTime } = options;

  const selectedSlotIndex = ref<number | null>(null);
  const rangeStartIdx = ref<number | null>(null);
  const rangeEndIdx = ref<number | null>(null);
  const nowTs = ref(Date.now());

  const visibleSlots = computed<AvailabilitySlot[]>(() =>
    availability.value?.filter((slot) => slot.status !== 'closed') ?? [],
  );

  const selectedSlot = computed<AvailabilitySlot | null>(() => {
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

  function isPastSlot(slot: AvailabilitySlot): boolean {
    return new Date(`${selectedDate.value}T${slot.endTime}:00`).getTime() <= nowTs.value;
  }

  function isSelectableAt(idx: number): boolean {
    const slot = visibleSlots.value[idx];
    return !!slot && slot.status === 'available' && !isPastSlot(slot);
  }

  function rangeAllAvailable(a: number, b: number): boolean {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    for (let i = lo; i <= hi; i += 1) {
      if (!isSelectableAt(i)) return false;
    }
    return true;
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
      if (isPastSlot(slot)) return;
      clearDetailSelection();
      selectHour(idx);
    }
  }

  const startTime = computed<string | null>(() => {
    if (!hasUserSelection.value || rangeStartIdx.value === null) return null;
    return visibleSlots.value[rangeStartIdx.value]?.startTime ?? null;
  });

  const endTime = computed<string | null>(() => {
    if (!hasUserSelection.value || rangeEndIdx.value === null) return null;
    return visibleSlots.value[rangeEndIdx.value]?.endTime ?? null;
  });

  const reserveStartTime = computed(() => startTime.value ?? defaultStartTime?.value ?? '');
  const reserveEndTime = computed(() => endTime.value ?? defaultEndTime?.value ?? '');

  const reserveRangeBookable = computed(() => {
    if (hasUserSelection.value) return true;
    if (!defaultStartTime || !defaultEndTime) return false;

    return visibleSlots.value.some(
      (slot) =>
        slot.status === 'available' &&
        !isPastSlot(slot) &&
        slot.startTime >= defaultStartTime.value &&
        slot.startTime < defaultEndTime.value,
    );
  });

  function getCellClass(slot: AvailabilitySlot, idx: number): AvailabilityCellClass {
    const past = isPastSlot(slot);
    const inUserRange = hasUserSelection.value && isInSelectedRange(idx);
    const isInDefault = !hasUserSelection.value && !past && !!defaultStartTime && !!defaultEndTime
      && slot.startTime >= defaultStartTime.value && slot.startTime < defaultEndTime.value;

    return {
      'hour-cell--green': slot.status === 'available',
      'hour-cell--red': slot.status === 'reserved',
      'hour-cell--amber': slot.status === 'blocked',
      'hour-cell--past': past,
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
    availabilityHourLabel,
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
