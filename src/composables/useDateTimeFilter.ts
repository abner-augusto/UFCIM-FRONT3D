import { ref, computed } from 'vue';
import { getCurrentPeriod, type PeriodKey } from '@/utils/period';
import { TIME_SLOT_RANGES } from '@/types/reservation';
import { toLocalISODate } from '@/utils/date';

/** Pure function: format ISO date string to short pt-BR locale (e.g. "21 de mai.") */
export function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}

/** Pure function: generate 3 date chips (Hoje, Amanhã, weekday) with ISO values */
export function createDateChips(): Array<{ value: string; label: string }> {
  const todayDate = new Date();
  const chips: Array<{ value: string; label: string }> = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(todayDate);
    d.setDate(todayDate.getDate() + i);
    const iso = toLocalISODate(d);
    let label: string;
    if (i === 0) label = 'Hoje';
    else if (i === 1) label = 'Amanhã';
    else label = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    chips.push({ value: iso, label });
  }
  return chips;
}

export function useDateTimeFilter() {
  const today = toLocalISODate();
  const selectedDate = ref<string>(today);
  const selectedPeriod = ref<PeriodKey>(getCurrentPeriod());
  const periodAutoDetected = ref(true);

  const isToday = computed(() => selectedDate.value === today);

  const dateChips = computed(() => createDateChips());

  const periodRange = computed(() => TIME_SLOT_RANGES[selectedPeriod.value]);

  const defaultStartTime = computed(() => {
    const rangeStart = periodRange.value.startTime;
    // When viewing today, start the default range at the *current* hour so the
    // "Reservar" button follows what's still bookable in the grid instead of the
    // fixed period start. The in-progress hour stays reservable (it ends later).
    if (isToday.value) {
      const currentHour = String(new Date().getHours()).padStart(2, '0') + ':00';
      // Clamp to period bounds: never before range start, never at/after range end.
      if (currentHour > rangeStart && currentHour < periodRange.value.endTime) {
        return currentHour;
      }
    }
    return rangeStart;
  });
  const defaultEndTime = computed(() => periodRange.value.endTime);

  function setDate(date: string) {
    selectedDate.value = date;
    if (date === today && periodAutoDetected.value) {
      selectedPeriod.value = getCurrentPeriod();
    }
  }

  function setPeriod(period: PeriodKey) {
    selectedPeriod.value = period;
    periodAutoDetected.value = false;
  }

  function openDatePicker() {
    const input = document.createElement('input');
    input.type = 'date';
    input.min = '2024-01-01';
    input.value = selectedDate.value;
    input.addEventListener('change', () => {
      if (input.value) setDate(input.value);
    });
    input.click();
  }

  return {
    selectedDate, selectedPeriod, periodAutoDetected,
    isToday, dateChips, periodRange, defaultStartTime, defaultEndTime,
    today,
    setDate, setPeriod, openDatePicker,
  };
}
