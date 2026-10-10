import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  TAP_MAX_MOVE_PX,
  isTap,
  findBuildingId,
  pinWins,
} from '@/three/pointerIntent.js';

function buildingMesh(building: string) {
  const mesh = new THREE.Mesh();
  mesh.userData.building = building;
  return mesh;
}

describe('isTap (MEL-002)', () => {
  it('accepts a press that did not move', () => {
    expect(isTap(0, 0)).toBe(true);
  });

  it('accepts movement below the threshold', () => {
    expect(isTap(2, 2)).toBe(true);
    expect(isTap(-2, -2)).toBe(true);
  });

  it('rejects movement at or beyond the threshold (orbit/pan drag)', () => {
    expect(isTap(TAP_MAX_MOVE_PX, 0)).toBe(false);
    expect(isTap(40, -10)).toBe(false);
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

  it('returns null for untagged or missing objects', () => {
    expect(findBuildingId(new THREE.Mesh())).toBeNull();
    expect(findBuildingId(null)).toBeNull();
    expect(findBuildingId(undefined)).toBeNull();
  });
});

describe('pinWins (MEL-002)', () => {
  it('is false without a pin hit', () => {
    expect(pinWins(undefined, undefined)).toBe(false);
    expect(pinWins(undefined, { distance: 5 })).toBe(false);
  });

  it('is true when no wall is on the ray', () => {
    expect(pinWins({ distance: 10 }, undefined)).toBe(true);
  });

  it('is true when the pin is in front of the wall (pin > building)', () => {
    expect(pinWins({ distance: 10 }, { distance: 20 })).toBe(true);
  });

  it('keeps the pin on a tie, as the occlusion check always did', () => {
    expect(pinWins({ distance: 10 }, { distance: 10 })).toBe(true);
  });

  it('is false when a wall hides the pin', () => {
    expect(pinWins({ distance: 10 }, { distance: 5 })).toBe(false);
  });
});
