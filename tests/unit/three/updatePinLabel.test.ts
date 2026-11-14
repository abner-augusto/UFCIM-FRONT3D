import { expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { PinFactory } from '../../../src/three/PinFactory.js';
import { InteractionManager } from '../../../src/three/InteractionManager.js';

it('reuses real pin textures until the label changes', () => {
  const manager = new InteractionManager(new THREE.PerspectiveCamera(), new THREE.Scene(), { removeEventListener: vi.fn() });
  const factory = new PinFactory();
  vi.spyOn(factory, 'createLabelCanvas').mockReturnValue({ width: 20, height: 10 });
  manager.pinFactory = factory;
  manager.addPins([{ id: 'id', displayName: 'Sala', position: [0, 0, 0], building: 'a', floorLevel: 0 }]);
  const sprite = manager.labelsById.get('id');
  const oldMap = sprite.material.map;
  const dispose = vi.spyOn(oldMap, 'dispose');
  manager.onChange = vi.fn();
  manager.updatePinLabelStatus('id', null, null);
  expect(sprite.material.map).toBe(oldMap);
  manager.updatePinLabelStatus('id', 'Livre', '#fff');
  const newMap = sprite.material.map;
  manager.updatePinLabelStatus('id', 'Livre', '#fff');
  expect(sprite.material.map).toBe(newMap);
  expect(dispose).toHaveBeenCalledOnce();
  expect(factory.createLabelCanvas).toHaveBeenCalledTimes(2);
  expect(manager.onChange).toHaveBeenCalledOnce();
  manager.dispose();
});
