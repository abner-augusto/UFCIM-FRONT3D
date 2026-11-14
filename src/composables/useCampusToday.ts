import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue';
import { campusISODate } from '@/utils/date';

export function useCampusToday() {
  const today = ref(campusISODate());
  const refresh = () => { today.value = campusISODate(); };
  let timer: ReturnType<typeof setInterval>;
  onMounted(() => {
    document.addEventListener('visibilitychange', refresh);
    timer = setInterval(refresh, 60_000);
  });
  onUnmounted(() => {
    document.removeEventListener('visibilitychange', refresh);
    clearInterval(timer);
  });
  return today;
}


export function followCampusToday(today: Ref<string>, selectedDate: Ref<string>) {
  watch(today, (date, previous) => {
    if (selectedDate.value === previous) selectedDate.value = date;
  });
}
