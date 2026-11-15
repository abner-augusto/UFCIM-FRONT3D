import { expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { PinFactory } from '../../../src/three/PinFactory.js';
import { LabelRegistry } from '../../../src/three/LabelRegistry.js';
import { InteractionManager } from '../../../src/three/InteractionManager.js';

it('reuses real pin textures until the label changes', () => {
  const scene = new THREE.Scene();
  const manager = new InteractionManager(new THREE.PerspectiveCamera(), scene, { removeEventListener: vi.fn() });
  const factory = new PinFactory();
  vi.spyOn(factory, 'createLabelCanvas').mockReturnValue({ width: 20, height: 10 });
  manager.pinFactory = factory;
  manager.addPins([{ id: 'id', displayName: 'Sala', position: [0, 0, 0], building: 'a', floorLevel: 0 }]);
  const sprite = scene.getObjectByName('id_label') as THREE.Sprite;
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

it('disposes a replaced label and retains the replacement until teardown', () => {
  const registry = new LabelRegistry(() => null, () => {});
  const first = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.Texture() }));
  const second = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.Texture() }));
  const disposeTexture = vi.spyOn(first.material.map!, 'dispose');
  const disposeMaterial = vi.spyOn(first.material, 'dispose');
  const disposeReplacement = vi.spyOn(second.material.map!, 'dispose');
  registry.add('id', first);
  registry.add('id', first);
  expect(disposeTexture).not.toHaveBeenCalled();
  registry.add('id', second);
  expect(disposeTexture).toHaveBeenCalledOnce();
  expect(disposeMaterial).toHaveBeenCalledOnce();
  registry.dispose();
  expect(disposeTexture).toHaveBeenCalledOnce();
  expect(disposeReplacement).toHaveBeenCalledOnce();
});
