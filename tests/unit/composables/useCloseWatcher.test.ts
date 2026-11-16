import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { useCloseWatcher } from '@/composables/useCloseWatcher';

interface FakeWatcherInstance {
  oncancel: ((event: Event) => void) | null;
  onclose: ((event: Event) => void) | null;
  close: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
  requestClose: ReturnType<typeof vi.fn>;
}

function installFakeCloseWatcher() {
  const instances: FakeWatcherInstance[] = [];

  class FakeCloseWatcher {
    oncancel: ((event: Event) => void) | null = null;
    onclose: ((event: Event) => void) | null = null;
    close = vi.fn();
    destroy = vi.fn();
    requestClose = vi.fn();

    constructor() {
      instances.push(this);
    }
  }

  vi.stubGlobal('window', { CloseWatcher: FakeCloseWatcher });
  return instances;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useCloseWatcher', () => {
  it('creates a watcher when open, calls close on onclose, and destroys on close', async () => {
    const instances = installFakeCloseWatcher();
    const open = ref(false);
    const close = vi.fn();
    const scope = effectScope();

    scope.run(() => {
      useCloseWatcher(open, close);
    });

    expect(instances).toHaveLength(0);

    open.value = true;
    await nextTick();
    expect(instances).toHaveLength(1);

    instances[0].onclose?.(new Event('close'));
    expect(close).toHaveBeenCalledTimes(1);

    open.value = false;
    await nextTick();
    expect(instances[0].destroy).toHaveBeenCalledTimes(1);

    scope.stop();
  });

  it('destroys the active watcher when the scope unmounts', () => {
    const instances = installFakeCloseWatcher();
    const open = ref(true);
    const scope = effectScope();

    scope.run(() => {
      useCloseWatcher(open, vi.fn());
    });

    expect(instances).toHaveLength(1);
    expect(instances[0].destroy).not.toHaveBeenCalled();

    scope.stop();
    expect(instances[0].destroy).toHaveBeenCalledTimes(1);
  });

  it('is a safe no-op when CloseWatcher is missing from window', async () => {
    vi.stubGlobal('window', {});
    const open = ref(true);
    const close = vi.fn();
    const scope = effectScope();

    expect(() => {
      scope.run(() => {
        useCloseWatcher(open, close);
      });
    }).not.toThrow();

    open.value = false;
    await nextTick();
    open.value = true;
    await nextTick();
    scope.stop();

    expect(close).not.toHaveBeenCalled();
  });

  it('is a safe no-op when window is undefined', async () => {
    const open = ref(true);
    const scope = effectScope();

    expect(() => {
      scope.run(() => {
        useCloseWatcher(open, vi.fn());
      });
    }).not.toThrow();

    open.value = false;
    await nextTick();
    scope.stop();
  });
});
