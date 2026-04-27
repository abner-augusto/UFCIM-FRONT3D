import { ref, computed, watch } from 'vue';
import { api } from '@/services/api';
import { derivePinStatus, type PinStatus } from '@/composables/usePinAvailability';
import type { Space } from '@/types/space';
import type { AvailabilitySlot } from '@/types/reservation';
import { getCurrentPeriod, type PeriodKey } from '@/utils/period';

export function useSpaceBrowser() {
  const allSpaces = ref<Space[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const searchQuery = ref('');
  const blockFilter = ref<string | null>(null);
  const typeFilter = ref<string | null>(null);
  const statusFilter = ref<PinStatus | null>(null);
  const selectedPeriod = ref<PeriodKey>(getCurrentPeriod());
  const periodAutoDetected = ref(true);
  const selectedDate = ref(new Date().toISOString().split('T')[0]);

  let currentToken: string | null = null;

  const availabilityCache = new Map<string, AvailabilitySlot[]>();
  const statusMap = ref(new Map<string, PinStatus>());
  const availabilityLoaded = ref(new Set<string>());
  const availabilityLoading = ref(false);

  let fetchSeq = 0;

  // --- Fetch all spaces for a campus ---

  async function loadSpaces(token: string | null, campus: string) {
    currentToken = token;
    loading.value = true;
    error.value = null;
    allSpaces.value = [];
    availabilityCache.clear();
    statusMap.value = new Map();
    availabilityLoaded.value = new Set();

    try {
      const first = await api.listSpaces(token, { campus, limit: '100' });
      let spaces = first;
      if (first.length === 100) {
        const second = await api.listSpaces(token, { campus, limit: '100', page: '2' });
        spaces = [...first, ...second];
      }
      allSpaces.value = spaces;
    } catch {
      error.value = 'Não foi possível carregar os espaços.';
    } finally {
      loading.value = false;
    }
  }

  // --- Batched availability fetching ---

  async function fetchAvailability(token: string | null, date: string) {
    const seq = ++fetchSeq;
    availabilityLoading.value = true;
    availabilityCache.clear();
    availabilityLoaded.value = new Set();
    statusMap.value = new Map();

    const spaces = allSpaces.value;
    const batch = 6;

    for (let i = 0; i < spaces.length; i += batch) {
      if (seq !== fetchSeq) return; // cancelled

      const chunk = spaces.slice(i, i + batch);
      const results = await Promise.allSettled(
        chunk.map((s) => api.getAvailability(token, s.id, date)),
      );

      if (seq !== fetchSeq) return;

      for (let j = 0; j < chunk.length; j++) {
        const result = results[j];
        if (result.status !== 'fulfilled') continue;
        const space = chunk[j];
        availabilityCache.set(space.id, result.value);
        availabilityLoaded.value = new Set(availabilityLoaded.value).add(space.id);
        statusMap.value = new Map(statusMap.value).set(
          space.id,
          derivePinStatus(result.value, selectedPeriod.value),
        );
      }
    }

    if (seq === fetchSeq) {
      availabilityLoading.value = false;
    }
  }

  // --- Re-derive statuses from cache on period change (no network) ---

  watch(selectedPeriod, () => {
    const newMap = new Map<string, PinStatus>();
    for (const [spaceId, slots] of availabilityCache) {
      newMap.set(spaceId, derivePinStatus(slots, selectedPeriod.value));
    }
    statusMap.value = newMap;
  });

  // --- Re-fetch availability when date changes ---

  watch(selectedDate, (date) => {
    if (allSpaces.value.length > 0) {
      fetchAvailability(currentToken, date);
    }
  });

  // --- Filtering ---

  const availableBlocks = computed(() =>
    [...new Set(allSpaces.value.map((s) => s.block))].sort(),
  );

  const availableTypes = computed(() =>
    [...new Set(allSpaces.value.map((s) => s.type))].sort(),
  );

  const filteredSpaces = computed(() => {
    let result = allSpaces.value;

    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.number.toLowerCase().includes(q),
      );
    }

    if (blockFilter.value) {
      result = result.filter((s) => s.block === blockFilter.value);
    }

    if (typeFilter.value) {
      result = result.filter((s) => s.type === typeFilter.value);
    }

    if (statusFilter.value) {
      result = result.filter((s) => statusMap.value.get(s.id) === statusFilter.value);
    }

    return result;
  });

  const groupedSpaces = computed(() => {
    const groups = new Map<string, Space[]>();
    for (const space of filteredSpaces.value) {
      if (!groups.has(space.block)) groups.set(space.block, []);
      groups.get(space.block)!.push(space);
    }
    return groups;
  });

  function setPeriod(period: PeriodKey) {
    periodAutoDetected.value = period === getCurrentPeriod();
    selectedPeriod.value = period;
  }

  return {
    allSpaces,
    loading,
    error,
    searchQuery,
    blockFilter,
    typeFilter,
    statusFilter,
    selectedPeriod,
    periodAutoDetected,
    selectedDate,
    statusMap,
    availabilityLoaded,
    availabilityLoading,
    availableBlocks,
    availableTypes,
    filteredSpaces,
    groupedSpaces,
    loadSpaces,
    fetchAvailability,
    setPeriod,
  };
}
