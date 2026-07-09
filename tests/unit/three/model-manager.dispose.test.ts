import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { ModelManager } from '@/three/ModelManager.js';
import { InteractionManager } from '@/three/InteractionManager.js';

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
