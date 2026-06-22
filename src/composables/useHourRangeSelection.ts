import { ref, computed, watch } from 'vue';
import type { Ref } from 'vue';
import type { AvailabilitySlot, Availability } from '@/types/reservation';

export function hourLabel(h: string): string {
  return h.replace(':00', 'h');
}

export function isHourAvailable(slot: AvailabilitySlot): boolean {
  return slot.status === 'available';
}

export function useHourRangeSelection(
  availability: Ref<Availability | null>,
  selectedDate: Ref<string>,
) {
  const pickedStart = ref<string | null>(null);
  const pickedEnd = ref<string | null>(null);
  const nowTs = ref(Date.now());

  function isPastTime(time: string): boolean {
    if (!selectedDate.value) return false;
    return new Date(`${selectedDate.value}T${time}:00`).getTime() <= nowTs.value;
  }

  // Reset picks and refresh "now" when the date changes
  watch(selectedDate, () => {
    pickedStart.value = null;
    pickedEnd.value = null;
    nowTs.value = Date.now();
  });

  function resetPicks() {
    pickedStart.value = null;
    pickedEnd.value = null;
  }

  const sortedHours = computed<AvailabilitySlot[]>(() => {
    if (!availability.value) return [];
    return [...availability.value].sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  function isHourSelectable(slot: AvailabilitySlot): boolean {
    // Bookable until the hour ends, so the in-progress hour stays selectable
    return isHourAvailable(slot) && !isPastTime(slot.endTime);
  }

  function hoursInRange(start: string, end: string): string[] {
    const result: string[] = [];
    for (const s of sortedHours.value) {
      if (s.startTime >= start && s.startTime < end) result.push(s.startTime);
    }
    return result;
  }

  function rangeFullyAvailable(start: string, end: string): boolean {
    return hoursInRange(start, end).every(h => {
      const s = sortedHours.value.find(x => x.startTime === h);
      return !!s && isHourSelectable(s);
    });
  }

  function getHourState(slot: AvailabilitySlot): 'available' | 'selected' | 'endpoint' | 'unavailable' {
    if (!isHourSelectable(slot)) return 'unavailable';
    const h = slot.startTime;
    if (!pickedStart.value) return 'available';
    if (pickedEnd.value) {
      if (h === pickedStart.value || h === pickedEnd.value) return 'endpoint';
      if (h > pickedStart.value && h < pickedEnd.value) return 'selected';
      return 'available';
    }
    if (h === pickedStart.value) return 'endpoint';
    return 'available';
  }

  function handleHourClick(slot: AvailabilitySlot) {
    if (!isHourSelectable(slot)) return;
    const h = slot.startTime;

    if (!pickedStart.value) {
      pickedStart.value = h;
      pickedEnd.value = null;
      return;
    }

    if (h === pickedStart.value && !pickedEnd.value) {
      pickedStart.value = null;
      return;
    }

    if (pickedEnd.value) {
      pickedStart.value = h;
      pickedEnd.value = null;
      return;
    }

    // Start is set, no end yet — pick ordered range
    const [lo, hi] = h > pickedStart.value
      ? [pickedStart.value, h]
      : [h, pickedStart.value];

    const lastSlot = sortedHours.value.find(s => s.startTime === hi);
    const rangeEnd = lastSlot?.endTime ?? hi;

    if (!rangeFullyAvailable(lo, rangeEnd)) {
      // Range contains an unavailable hour — restart from clicked slot
      pickedStart.value = h;
      pickedEnd.value = null;
      return;
    }

    pickedStart.value = lo;
    pickedEnd.value = hi; // startTime of the last selected hour; endTime via customRangeEnd
  }

  const customRangeEnd = computed<string | null>(() => {
    if (!pickedEnd.value) return null;
    const lastSlot = sortedHours.value.find(s => s.startTime === pickedEnd.value);
    return lastSlot?.endTime ?? null;
  });

  const customRangeLabel = computed<string | null>(() => {
    if (!pickedStart.value) return null;
    if (!pickedEnd.value) return `A partir de ${hourLabel(pickedStart.value)} — selecione o horário final`;
    return `${hourLabel(pickedStart.value)} – ${hourLabel(customRangeEnd.value ?? pickedEnd.value)}`;
  });

  return {
    pickedStart,
    pickedEnd,
    sortedHours,
    isPastTime,
    resetPicks,
    isHourSelectable,
    hoursInRange,
    rangeFullyAvailable,
    getHourState,
    handleHourClick,
    customRangeEnd,
    customRangeLabel,
    hourLabel,
    isHourAvailable,
  };
}
