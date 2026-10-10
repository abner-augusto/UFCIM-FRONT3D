import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  TAP_MAX_MOVE_PX,
  isTap,
  findBuildingId,
  resolvePointerTarget,
} from '@/three/pointerIntent.js';

function buildingMesh(building: string) {
  const mesh = new THREE.Mesh();
  mesh.userData.building = building;
  return mesh;
}

describe('isTap (MEL-002)', () => {
  it('accepts a press that did not move', () => {
    expect(isTap({ x: 100, y: 100 }, { x: 100, y: 100 })).toBe(true);
  });

  it('accepts movement below the threshold', () => {
    expect(isTap({ x: 100, y: 100 }, { x: 102, y: 102 })).toBe(true);
  });

  it('rejects movement at or beyond the threshold (orbit/pan drag)', () => {
    expect(isTap({ x: 100, y: 100 }, { x: 100 + TAP_MAX_MOVE_PX, y: 100 })).toBe(false);
    expect(isTap({ x: 100, y: 100 }, { x: 140, y: 90 })).toBe(false);
  });

  it('rejects a missing start or end point', () => {
    expect(isTap(null, { x: 0, y: 0 })).toBe(false);
    expect(isTap({ x: 0, y: 0 }, null)).toBe(false);
  });
});

describe('findBuildingId (MEL-002)', () => {
  it('reads the building tag from the hit mesh', () => {
    expect(findBuildingId(buildingMesh('bloco2'))).toBe('bloco2');
  });

  it('walks up to an ancestor carrying the tag', () => {
    const parent = buildingMesh('bloco3');
    const child = new THREE.Mesh();
    parent.add(child);
    expect(findBuildingId(child)).toBe('bloco3');
  });

  it('returns null for untagged objects', () => {
    expect(findBuildingId(new THREE.Mesh())).toBeNull();
    expect(findBuildingId(null)).toBeNull();
  });
});

describe('resolvePointerTarget (MEL-002)', () => {
  it('returns null when the ray hits nothing', () => {
    expect(resolvePointerTarget(undefined, undefined)).toBeNull();
  });

  it('picks the pin when no building is on the ray', () => {
    expect(resolvePointerTarget({ distance: 10 }, undefined)).toEqual({ type: 'pin' });
  });

  it('picks the pin when it is in front of the building (pin > building)', () => {
    const wall = { distance: 20, object: buildingMesh('bloco1') };
    expect(resolvePointerTarget({ distance: 10 }, wall)).toEqual({ type: 'pin' });
  });

  it('keeps the pin on a tie, as the occlusion check always did', () => {
    const wall = { distance: 10, object: buildingMesh('bloco1') };
    expect(resolvePointerTarget({ distance: 10 }, wall)).toEqual({ type: 'pin' });
  });

  it('picks the building when its wall hides the pin', () => {
    const wall = { distance: 5, object: buildingMesh('bloco1') };
    expect(resolvePointerTarget({ distance: 10 }, wall)).toEqual({ type: 'building', building: 'bloco1' });
  });

  it('picks the building when no pin is on the ray', () => {
    const wall = { distance: 5, object: buildingMesh('pavilhao') };
    expect(resolvePointerTarget(undefined, wall)).toEqual({ type: 'building', building: 'pavilhao' });
  });

  it('returns null when the first wall hit has no building tag', () => {
    const wall = { distance: 5, object: new THREE.Mesh() };
    expect(resolvePointerTarget(undefined, wall)).toBeNull();
    expect(resolvePointerTarget({ distance: 10 }, wall)).toBeNull();
  });
});
