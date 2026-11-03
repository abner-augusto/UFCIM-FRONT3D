import { ref, watch, onUnmounted, toValue, type MaybeRefOrGetter } from 'vue';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import type { SpaceAirQuality } from '@/types/air-quality';

/** The collector sends one sample per minute; refreshing faster shows nothing new. */
export const AIR_QUALITY_REFRESH_MS = 60_000;

/**
 * The room's air quality, fetched when the room changes and refreshed every
 * minute while the popup is open. A failed fetch keeps the last good value:
 * the block is supplementary and must never break the popup.
 */
export function useAirQuality(spaceId: MaybeRefOrGetter<string>) {
  const auth = useAuthStore();
  const data = ref<SpaceAirQuality | null>(null);
  const loading = ref(false);
  let timer: ReturnType<typeof setInterval> | null = null;
  let requestSeq = 0;

  async function load() {
    const id = toValue(spaceId);
    const seq = ++requestSeq;
    loading.value = data.value === null;
    try {
      const result = await api.getSpaceAirQuality(auth.token, id);
      if (seq === requestSeq) data.value = result;
    } catch {
      // Keep the last value; the next tick retries.
    } finally {
      if (seq === requestSeq) loading.value = false;
    }
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  watch(
    () => toValue(spaceId),
    () => {
      data.value = null;
      stop();
      void load();
      timer = setInterval(load, AIR_QUALITY_REFRESH_MS);
    },
    { immediate: true },
  );

  onUnmounted(stop);

  return { data, loading, reload: load };
}
