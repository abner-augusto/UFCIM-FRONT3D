import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { ModelManager } from '@/three/ModelManager.js';
import { InteractionManager } from '@/three/InteractionManager.js';
import { PinFactory } from '@/three/PinFactory.js';

// Engine files are plain JS; reach into their internals via `any` casts
// (no-explicit-any is a warning, not an error, in this repo).
/* eslint-disable @typescript-eslint/no-explicit-any */

function makeEntry(overrides: Record<string, unknown> = {}) {
  return {
    key: 'B1:floor0',
    building: 'B1',
    floor: 0,
    path: 'x.glb',
    object: null,
    visible: true,
    name: 'Térreo',
    bbox: new THREE.Box3(),
    pins: [],
    pinsLoaded: false,
    loadingPromise: null,
    ...overrides,
  };
}

function makeGltf() {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  group.add(mesh);
  return { scene: group, mesh };
}

describe('ModelManager teardown-during-load race (BUG-013)', () => {
  it('does not build manifest entries when the manifest resolves after dispose', async () => {
    const mm = new ModelManager(new THREE.Scene()) as any;
    let resolveManifest!: (manifest: unknown) => void;
    const json = vi.fn(() => new Promise((resolve) => { resolveManifest = resolve; }));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json }));

    const initPromise = mm.initFromManifest();
    await vi.waitFor(() => expect(json).toHaveBeenCalled());
    mm.dispose();
    resolveManifest({ B1: { floors: [{ floor: 0, path: 'x.glb' }] } });
    await initPromise;

    expect(mm.entries.size).toBe(0);
    expect(mm.manifest).toEqual({});
    vi.unstubAllGlobals();
  });

  it('frees a GLB load that resolves after dispose instead of adding it to the dead scene', async () => {
    const scene = new THREE.Scene();
    const mm = new ModelManager(scene) as any;
    mm.entries.set('B1', new Map([[0, makeEntry()]]));

    // Deferred loader: we control exactly when the GLB "arrives".
    let resolveLoad!: (gltf: unknown) => void;
    mm.loader = { loadAsync: vi.fn(() => new Promise((r) => { resolveLoad = r; })) };

    const pinsSpy = vi.fn();
    mm.onPinsLoaded = pinsSpy;

    const loadP = mm._ensureLoaded('B1', 0); // suspends at the loadAsync await
    mm.dispose();                            // viewer torn down mid-load

    const { scene: gltfScene, mesh } = makeGltf();
    const geomDisposeSpy = vi.spyOn(mesh.geometry, 'dispose');
    const matDisposeSpy = vi.spyOn(mesh.material as THREE.Material, 'dispose');
    resolveLoad({ scene: gltfScene });
    await loadP;

    expect(scene.children.length).toBe(0);       // nothing added to the disposed scene
    expect(geomDisposeSpy).toHaveBeenCalled();    // the late load's GPU buffers were freed
    expect(matDisposeSpy).toHaveBeenCalled();
    expect(pinsSpy).not.toHaveBeenCalled();       // no pins emitted after teardown
  });

  it('adds the model normally when the load resolves before dispose', async () => {
    const scene = new THREE.Scene();
    const mm = new ModelManager(scene) as any;
    mm.entries.set('B1', new Map([[0, makeEntry()]]));

    let resolveLoad!: (gltf: unknown) => void;
    mm.loader = { loadAsync: vi.fn(() => new Promise((r) => { resolveLoad = r; })) };

    const loadP = mm._ensureLoaded('B1', 0);
    const { scene: gltfScene } = makeGltf();
    resolveLoad({ scene: gltfScene });
    await loadP;

    expect(scene.children).toContain(gltfScene);
    expect(mm.entries.get('B1').get(0).object).toBe(gltfScene);
  });
});

describe('InteractionManager.addPins guard after dispose (BUG-013)', () => {
  it('does not attach pointer events when pin assets resolve after dispose', async () => {
    let resolveAssets!: () => void;
    const loadAssets = vi.spyOn(PinFactory.prototype, 'loadAssets')
      .mockImplementation(() => new Promise<void>((resolve) => { resolveAssets = resolve; }));
    const canvas = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
    const im = new InteractionManager(
      {} as THREE.Camera,
      new THREE.Scene(),
      canvas as unknown as HTMLCanvasElement,
    ) as any;
    const initPromise = im.init();
    const disposeTexture = vi.fn();
    im.pinFactory.pinTexture = { dispose: disposeTexture };

    im.dispose();
    resolveAssets();
    await initPromise;

    expect(canvas.addEventListener).not.toHaveBeenCalled();
    expect(disposeTexture).toHaveBeenCalled();
    loadAssets.mockRestore();
  });

  it('is a no-op once disposed', () => {
    const canvas = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
    const im = new InteractionManager(
      {} as THREE.Camera,
      new THREE.Scene(),
      canvas as unknown as HTMLCanvasElement,
    ) as any;

    im.dispose();
    im.addPins([{ id: 'x', position: [0, 0, 0] }]);

    expect(im.interactiveObjects.length).toBe(0);
  });
});
