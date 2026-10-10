import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { InteractionManager } from '@/three/InteractionManager.js';
import { PinFactory } from '@/three/PinFactory.js';
import { CameraManager } from '@/three/CameraManager.js';
import { ModelManager } from '@/three/ModelManager.js';
import { App } from '@/three/App.js';

// Engine files are plain JS; reach into their internals via `any` casts
// (no-explicit-any is a warning, not an error, in this repo).
/* eslint-disable @typescript-eslint/no-explicit-any */

type Handler = (event: any) => void;

function makeCanvas() {
  const handlers = new Map<string, Handler>();
  return {
    handlers,
    addEventListener: vi.fn((type: string, fn: Handler) => { handlers.set(type, fn); }),
    removeEventListener: vi.fn((type: string, fn: Handler) => {
      if (handlers.get(type) === fn) handlers.delete(type);
    }),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
  };
}

function pointer(overrides: Record<string, unknown> = {}) {
  return { pointerId: 1, isPrimary: true, button: 0, clientX: 100, clientY: 100, ...overrides };
}

function buildingMesh(building: string) {
  const mesh = new THREE.Mesh();
  mesh.userData.building = building;
  return mesh;
}

describe('InteractionManager building click (MEL-002)', () => {
  let canvas: ReturnType<typeof makeCanvas>;
  let im: any;
  let pinHits: any[];
  let wallHits: any[];
  let onBuilding: ReturnType<typeof vi.fn>;
  let onPin: ReturnType<typeof vi.fn>;

  const fire = (type: string, event: any) => canvas.handlers.get(type)?.(event);

  beforeEach(async () => {
    vi.spyOn(PinFactory.prototype, 'loadAssets').mockResolvedValue(undefined);
    canvas = makeCanvas();
    im = new InteractionManager({} as THREE.Camera, new THREE.Scene(), canvas as unknown as HTMLCanvasElement);
    await im.init();

    pinHits = [];
    wallHits = [];
    im.blockingMeshes = [buildingMesh('bloco1')];
    im.clickTargets = [new THREE.Sprite()];
    im.raycaster = {
      setFromCamera: vi.fn(),
      intersectObjects: vi.fn((objects: unknown[]) => (objects === im.blockingMeshes ? wallHits : pinHits)),
    };

    onBuilding = vi.fn();
    onPin = vi.fn();
    im.addEventListener('buildingClick', onBuilding);
    im.addEventListener('pinClick', onPin);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fires buildingClick on pointerup after a tap on a building', () => {
    wallHits = [{ distance: 5, object: im.blockingMeshes[0] }];

    fire('pointerdown', pointer());
    expect(onBuilding).not.toHaveBeenCalled();
    fire('pointerup', pointer({ clientX: 102, clientY: 101 }));

    expect(onBuilding).toHaveBeenCalledTimes(1);
    expect(onBuilding.mock.calls[0][0].building).toBe('bloco1');
    expect(onPin).not.toHaveBeenCalled();
  });

  it('does not fire when the pointer was dragged (orbit/pan)', () => {
    wallHits = [{ distance: 5, object: im.blockingMeshes[0] }];

    fire('pointerdown', pointer());
    fire('pointerup', pointer({ clientX: 160, clientY: 100 }));

    expect(onBuilding).not.toHaveBeenCalled();
  });

  it('does not fire when a drag returns to its starting point', () => {
    wallHits = [{ distance: 5, object: im.blockingMeshes[0] }];

    fire('pointerdown', pointer());
    fire('pointermove', pointer({ clientX: 160, clientY: 100 }));
    fire('pointerup', pointer());

    expect(onBuilding).not.toHaveBeenCalled();
  });

  it('does not fire during a pinch (second touch)', () => {
    wallHits = [{ distance: 5, object: im.blockingMeshes[0] }];

    fire('pointerdown', pointer({ pointerId: 7 }));
    fire('pointerdown', pointer({ pointerId: 8, isPrimary: false, clientX: 300 }));
    fire('pointerup', pointer({ pointerId: 8, isPrimary: false, clientX: 300 }));
    fire('pointerup', pointer({ pointerId: 7 }));

    expect(onBuilding).not.toHaveBeenCalled();
  });

  it('recovers after a touch whose pointerup was never delivered', () => {
    wallHits = [{ distance: 5, object: im.blockingMeshes[0] }];

    fire('pointerdown', pointer({ pointerId: 7 })); // lost: no pointerup
    fire('pointerdown', pointer({ pointerId: 9 }));
    fire('pointerup', pointer({ pointerId: 9 }));

    expect(onBuilding).toHaveBeenCalledTimes(1);
  });

  it('gives the pin priority when it is in front of the building', () => {
    const sprite = im.clickTargets[0];
    sprite.userData.id = 'sala-101';
    pinHits = [{ distance: 3, object: sprite }];
    wallHits = [{ distance: 5, object: im.blockingMeshes[0] }];

    fire('pointerdown', pointer());
    fire('pointerup', pointer());

    expect(onPin).toHaveBeenCalledTimes(1);
    expect(onPin.mock.calls[0][0].pinId).toBe('sala-101');
    expect(onBuilding).not.toHaveBeenCalled();
  });

  it('focuses the building when its wall hides the pin', () => {
    pinHits = [{ distance: 9, object: im.clickTargets[0] }];
    wallHits = [{ distance: 5, object: im.blockingMeshes[0] }];

    fire('pointerdown', pointer());
    fire('pointerup', pointer());

    expect(onPin).not.toHaveBeenCalled();
    expect(onBuilding).toHaveBeenCalledTimes(1);
  });

  it('ignores secondary mouse buttons', () => {
    wallHits = [{ distance: 5, object: im.blockingMeshes[0] }];

    fire('pointerdown', pointer({ button: 2 }));
    fire('pointerup', pointer({ button: 2 }));

    expect(onBuilding).not.toHaveBeenCalled();
  });

  it('ignores clicks while interactions are disabled', () => {
    wallHits = [{ distance: 5, object: im.blockingMeshes[0] }];
    im.setInteractionsEnabled(false);

    fire('pointerdown', pointer());
    fire('pointerup', pointer());

    expect(onBuilding).not.toHaveBeenCalled();
  });

  it('drops the pending tap on pointercancel', () => {
    wallHits = [{ distance: 5, object: im.blockingMeshes[0] }];

    fire('pointerdown', pointer());
    fire('pointercancel', pointer());
    fire('pointerup', pointer());

    expect(onBuilding).not.toHaveBeenCalled();
  });

  it('removes every pointer listener it added on dispose', () => {
    expect(canvas.handlers.size).toBeGreaterThan(0);
    im.dispose();
    expect(canvas.handlers.size).toBe(0);
    expect(canvas.removeEventListener).toHaveBeenCalledTimes(canvas.addEventListener.mock.calls.length);
  });
});

describe('CameraManager.focusOnBoundingBox (MEL-002)', () => {
  function makeCameraManager() {
    const camera = new THREE.PerspectiveCamera();
    const controls = { minDistance: 20, maxDistance: 150, target: new THREE.Vector3(), update: vi.fn() };
    const cm = new CameraManager(camera, controls) as any;
    cm.fitCameraToBox = vi.fn();
    return cm;
  }

  it('frames a valid box with the selector/deep-link framing', () => {
    const cm = makeCameraManager();
    const box = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 5, 10));

    expect(cm.focusOnBoundingBox(box)).toBe(true);
    expect(cm.fitCameraToBox).toHaveBeenCalledWith(box);
  });

  it('is a no-op for a missing or empty box', () => {
    const cm = makeCameraManager();

    expect(cm.focusOnBoundingBox(new THREE.Box3())).toBe(false);
    expect(cm.focusOnBoundingBox(null)).toBe(false);
    expect(cm.fitCameraToBox).not.toHaveBeenCalled();
  });
});

describe('ModelManager building tags (MEL-002)', () => {
  it('tags visible meshes with their building and reports them', () => {
    const mm = new ModelManager(new THREE.Scene()) as any;
    const root = new THREE.Group();
    const mesh = new THREE.Mesh();
    root.add(mesh);
    mm.entries.set('bloco2', new Map([[0, { building: 'bloco2', floor: 0, object: root, visible: false }]]));
    mm.enabledBuildings.add('bloco2');
    mm.maxFloorVisibleByBuilding.set('bloco2', 0);
    const onMeshes = vi.fn();
    mm.onVisibleMeshesChange = onMeshes;

    mm._applyVisibility();

    expect(mesh.userData.building).toBe('bloco2');
    expect(onMeshes).toHaveBeenCalledWith([mesh]);
  });
});

describe('App building click handling (MEL-002)', () => {
  function fakeApp(activeBuilding: string | null) {
    return {
      _disposed: false,
      uiManager: {
        getActiveBuildingId: () => activeBuilding,
        getBuildingsList: () => [{ id: 'bloco1', name: 'Bloco1' }, { id: 'bloco2', name: 'Bloco2' }],
        selectBuilding: vi.fn().mockResolvedValue(undefined),
      },
    };
  }

  const onBuildingClick = (app: unknown, building: string) =>
    (App.prototype as any)._onBuildingClick.call(app, building);

  it('focuses the clicked building like the selector does', () => {
    const app = fakeApp(null);
    onBuildingClick(app, 'bloco2');
    expect(app.uiManager.selectBuilding).toHaveBeenCalledWith('bloco2');
  });

  it('does not toggle when the clicked building is already active', () => {
    const app = fakeApp('bloco2');
    onBuildingClick(app, 'bloco2');
    expect(app.uiManager.selectBuilding).not.toHaveBeenCalled();
  });

  it('ignores buildings the selector does not list (hidden surroundings)', () => {
    const app = fakeApp(null);
    onBuildingClick(app, 'entorno');
    expect(app.uiManager.selectBuilding).not.toHaveBeenCalled();
  });

  it('ignores clicks after dispose', () => {
    const app = { ...fakeApp(null), _disposed: true };
    onBuildingClick(app, 'bloco1');
    expect(app.uiManager.selectBuilding).not.toHaveBeenCalled();
  });
});
