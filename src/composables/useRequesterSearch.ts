import { onBeforeUnmount, ref, watch, type Ref } from 'vue';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import type { RequesterCandidate } from '@/types/reservation';
import type { RequesterSelection } from '@/utils/reservation-requester';

const SEARCH_DELAY_MS = 300;
export const MIN_REQUESTER_QUERY = 2;

export function useRequesterSearch(selection: Ref<RequesterSelection>) {
  const auth = useAuthStore();
  const results = ref<RequesterCandidate[]>([]);
  const searching = ref(false);
  const searchFailed = ref(false);
  let searchTimer: ReturnType<typeof setTimeout> | null = null;
  let searchAbort: AbortController | null = null;

  function cancelSearch() {
    if (searchTimer) {
      clearTimeout(searchTimer);
      searchTimer = null;
    }
    searchAbort?.abort();
    searchAbort = null;
  }

  async function runSearch(q: string) {
    const controller = new AbortController();
    searchAbort = controller;
    searching.value = true;
    searchFailed.value = false;
    try {
      const found = await api.searchUsers(auth.token, q, { signal: controller.signal });
      if (!controller.signal.aborted) results.value = found;
    } catch {
      if (!controller.signal.aborted) {
        results.value = [];
        searchFailed.value = true;
      }
    } finally {
      if (searchAbort === controller) {
        searching.value = false;
        searchAbort = null;
      }
    }
  }

  watch(
    () => [selection.value.query, selection.value.user] as const,
    ([query, user]) => {
      cancelSearch();
      const q = query.trim();
      if (user || q.length < MIN_REQUESTER_QUERY) {
        results.value = [];
        searching.value = false;
        return;
      }
      searching.value = true;
      searchTimer = setTimeout(() => {
        searchTimer = null;
        void runSearch(q);
      }, SEARCH_DELAY_MS);
    },
  );

  onBeforeUnmount(cancelSearch);

  function resetSearch() {
    cancelSearch();
    results.value = [];
  }

  return { results, searching, searchFailed, resetSearch };
}
