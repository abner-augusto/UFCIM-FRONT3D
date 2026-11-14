import { describe, it, expect, vi, afterEach } from 'vitest';
import * as THREE from 'three';
import { InteractionManager } from '@/three/InteractionManager.js';
import { PinFactory } from '@/three/PinFactory.js';

type Handler = (event: unknown) => void;

function pinSprites(id: string, opensPopup: boolean) {
  const pinSprite = new THREE.Sprite();
  pinSprite.userData = { id, building: 'bloco1', floorLevel: 0, opensPopup };
  const labelSprite = new THREE.Sprite();
  return { pinSprite, labelSprite };
}

async function managerWithPin(opensPopup: boolean) {
  vi.spyOn(PinFactory.prototype, 'loadAssets').mockResolvedValue(undefined);
  const handlers = new Map<string, Handler>();
  const canvas = {
    addEventListener: (type: string, fn: Handler) => handlers.set(type, fn),
    removeEventListener: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
  };
  const im = new InteractionManager({} as THREE.Camera, new THREE.Scene(), canvas as unknown as HTMLCanvasElement);
  await im.init();
  const sprites = pinSprites('LABCAD', opensPopup);
  im.pinFactory = { createPinAndLabel: () => sprites } as unknown as PinFactory;
  im.addPins([{ id: 'LABCAD', building: 'bloco1', floorLevel: 0, position: [0, 0, 0], opensPopup }]);
  const rayThroughDotOnly = {
    setFromCamera: () => {},
    intersectObjects: (objects: THREE.Object3D[]) =>
      objects.includes(sprites.pinSprite) ? [{ distance: 3, object: sprites.pinSprite }] : [],
  };
  im.raycaster = rayThroughDotOnly as unknown as THREE.Raycaster;
  const onPin = vi.fn();
  im.addEventListener('pinClick', onPin);
  const clickDot = () => handlers.get('pointerdown')?.({ pointerId: 1, isPrimary: true, button: 0, clientX: 10, clientY: 10 });
  return { im, onPin, clickDot };
}

describe('pin dot click', () => {
  afterEach(() => vi.restoreAllMocks());

  it('opens the popup from the dot of a manifest-silent pin the backend lists', async () => {
    const { im, onPin, clickDot } = await managerWithPin(false);
    im.applyBackendFilter(new Set(['LABCAD']));

    clickDot();

    expect(onPin).toHaveBeenCalledTimes(1);
    expect(onPin.mock.calls[0][0].pinId).toBe('LABCAD');
  });

  it('ignores the dot of a pin the backend does not list', async () => {
    const { im, onPin, clickDot } = await managerWithPin(true);
    im.applyBackendFilter(new Set());

    clickDot();

    expect(onPin).not.toHaveBeenCalled();
  });
});
