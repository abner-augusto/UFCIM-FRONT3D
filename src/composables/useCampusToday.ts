import { onMounted, onUnmounted, ref } from 'vue';
import { toLocalISODate } from '@/utils/date';

export function useCampusToday() {
  const today = ref(toLocalISODate());
  const refresh = () => { today.value = toLocalISODate(); };
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

