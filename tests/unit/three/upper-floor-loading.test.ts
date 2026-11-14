import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { ModelManager } from '@/three/ModelManager.js';

describe('upper floor loading', () => {
  it('starts another floor as soon as a slot is free, with at most four in flight', async () => {
    const manager = new ModelManager(new THREE.Scene());
    const finish: (() => void)[] = [];
    let active = 0;
    let peak = 0;
    manager._ensureLoaded = vi.fn(() => new Promise<void>(resolve => {
      active++;
      peak = Math.max(peak, active);
      finish.push(() => { active--; resolve(); });
    }));
    manager._applyVisibility = vi.fn();
    const entries = Array.from({ length: 6 }, (_, floor) => ({ building: 'a', floor }));
    const loading = manager._loadUpperFloors(entries);
    expect(manager._ensureLoaded).toHaveBeenCalledTimes(4);
    finish[0]();
    await Promise.resolve();
    expect(manager._ensureLoaded).toHaveBeenCalledTimes(5);
    finish[1]();
    await Promise.resolve();
    expect(manager._ensureLoaded).toHaveBeenCalledTimes(6);
    finish.slice(2).forEach(done => done());
    await loading;
    expect(peak).toBe(4);
    expect(manager._applyVisibility).toHaveBeenCalledOnce();
    manager.dispose();
  });
});
