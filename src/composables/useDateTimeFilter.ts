import { ref, computed } from 'vue';
import { getCurrentPeriod, type PeriodKey } from '@/utils/period';
import { TIME_SLOT_RANGES } from '@/types/reservation';

export function useDateTimeFilter() {
  const today = new Date().toISOString().split('T')[0];
  const selectedDate = ref<string>(today);
  const selectedPeriod = ref<PeriodKey>(getCurrentPeriod());
  const periodAutoDetected = ref(true);

  const isToday = computed(() => selectedDate.value === today);

  const periodRange = computed(() => TIME_SLOT_RANGES[selectedPeriod.value]);

  const defaultStartTime = computed(() => periodRange.value.startTime);
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

  return {
    selectedDate, selectedPeriod, periodAutoDetected,
    isToday, periodRange, defaultStartTime, defaultEndTime,
    today,
    setDate, setPeriod,
  };
}
