import { describe, expect, it, vi } from 'vitest';
import { createRenderer, nextTick, ssrContextKey } from 'vue';
import ThreeViewer from '@/components/ThreeViewer.vue';

const deferred = vi.hoisted(() => {
  let resolve!: (value: { App: ReturnType<typeof vi.fn> }) => void;
  const promise = new Promise<{ App: ReturnType<typeof vi.fn> }>((r) => { resolve = r; });
  return { promise, resolve };
});
vi.mock('@/three/App.js', () => deferred.promise);

describe('ThreeViewer teardown', () => {
  it('does not construct the engine when the import resolves after unmount', async () => {
    const renderer = createRenderer<any, any>({
      createElement: () => ({}),
      insert: () => {},
      remove: () => {},
      createText: () => ({}),
      createComment: () => ({}),
      setText: () => {},
      setElementText: () => {},
      parentNode: () => null,
      nextSibling: () => null,
      patchProp: () => {},
    });
    vi.stubGlobal('window', { removeEventListener: vi.fn(), addEventListener: vi.fn() });
    vi.stubGlobal('document', { body: { classList: { remove: vi.fn() } } });
    const viewer = renderer.createApp(ThreeViewer);
    viewer.provide(ssrContextKey, { modules: new Set() });
    viewer.mount({});
    viewer.unmount();
    const App = vi.fn();
    deferred.resolve({ App });
    await vi.dynamicImportSettled();
    await nextTick();
    expect(App).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
