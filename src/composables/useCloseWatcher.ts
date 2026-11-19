import { getCurrentScope, onScopeDispose, toValue, watch, type MaybeRefOrGetter } from 'vue';

export function useCloseWatcher(open: MaybeRefOrGetter<boolean>, close: () => void): void {
  let watcher: CloseWatcher | null = null;

  function cleanup() {
    if (!watcher) return;
    const current = watcher;
    watcher = null;
    current.onclose = null;
    current.destroy();
  }

  function createWatcher() {
    const CloseWatcherCtor = typeof window === 'undefined' ? undefined : window.CloseWatcher;
    if (!CloseWatcherCtor) return;

    cleanup();
    const instance = new CloseWatcherCtor();
    instance.onclose = () => {
      close();
    };
    watcher = instance;
  }

  watch(
    () => Boolean(toValue(open)),
    (isOpen) => {
      if (isOpen) createWatcher();
      else cleanup();
    },
    { immediate: true },
  );

  if (getCurrentScope()) {
    onScopeDispose(cleanup);
  }
}
