import { describe, it, expect, vi, afterEach } from 'vitest';
import * as THREE from 'three';
import { RenderScheduler, observeContainer } from '@/three/RenderScheduler.js';
import { CameraManager } from '@/three/CameraManager.js';
import { App } from '@/three/App.js';
import { InteractionManager } from '@/three/InteractionManager.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
afterEach(() => vi.unstubAllGlobals());

describe('on-demand rendering', () => {
  it('renders only invalidated frames, retaining work while paused', () => {
    let callback: FrameRequestCallback = () => {};
    const render = vi.fn();
    const cancel = vi.fn();
    const scheduler = new RenderScheduler(render, (fn: FrameRequestCallback) => { callback = fn; return 1; }, cancel);
    scheduler.invalidate();
    scheduler.invalidate();
    callback(0);
    expect(render).toHaveBeenCalledTimes(1);
    scheduler.setPaused('hidden', true);
    scheduler.invalidate();
    expect(render).toHaveBeenCalledTimes(1);
    scheduler.setPaused('hidden', false);
    callback(1);
    expect(render).toHaveBeenCalledTimes(2);
    scheduler.invalidate();
    scheduler.dispose();
    expect(cancel).toHaveBeenCalledWith(1);
  });

  it('continues rendering a camera tween when an overlay disables interactions', () => {
    const callbacks: FrameRequestCallback[] = [];
    const renderer = { render: vi.fn() };
    const app = { renderer, scene: {}, camera: { position: { y: 100 } },
      controls: { update: () => false }, cameraManager: { tweens: { update: vi.fn().mockReturnValueOnce(true).mockReturnValue(false) } },
      _applyPendingResize: vi.fn(), invalidate: () => scheduler.invalidate() } as any;
    const scheduler = new RenderScheduler(() => App.prototype.animate.call(app), (fn: FrameRequestCallback) => { callbacks.push(fn); return callbacks.length; }, () => {});
    const interaction = new InteractionManager({} as any, {} as any, {} as any);
    scheduler.invalidate();
    interaction.setInteractionsEnabled(false);
    callbacks.shift()!(0);
    callbacks.shift()!(1);
    expect(renderer.render).toHaveBeenCalledTimes(2);
  });

  it('invalidates when restoring without a saved camera', () => {
    const invalidate = vi.fn();
    const manager = new CameraManager(new THREE.PerspectiveCamera(), { minDistance: 1, maxDistance: 2 }, invalidate);
    manager.restoreSavedState();
    expect(invalidate).toHaveBeenCalledOnce();
  });

  it('disconnects the container observer and cancels the pending frame on dispose', () => {
    const disconnect = vi.fn();
    const observe = vi.fn();
    vi.stubGlobal('ResizeObserver', class { observe = observe; disconnect = disconnect; });
    const observer = observeContainer({ parentElement: {} }, () => {});
    const cancel = vi.fn();
    const scheduler = new RenderScheduler(() => {}, () => 7, cancel);
    scheduler.invalidate();
    const app = { _resizeObserver: observer, scheduler, controls: { removeEventListener: vi.fn(), dispose: vi.fn() }, scene: { traverse: vi.fn(), children: [] }, renderer: { dispose: vi.fn() } } as any;
    vi.stubGlobal('document', { removeEventListener: vi.fn() });
    App.prototype.dispose.call(app);
    expect(observe).toHaveBeenCalledOnce();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(cancel).toHaveBeenCalledWith(7);
  });

  it('snaps the camera immediately when reduced motion is requested', () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) });
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(100, 100, 100);
    const controls = { target: new THREE.Vector3(10, 10, 10), minDistance: 1, maxDistance: 1000, update: vi.fn(), enabled: true };
    const invalidate = vi.fn();
    const manager = new CameraManager(camera, controls, invalidate);
    manager.resetToDefaultState();
    expect(camera.position.x).not.toBe(100);
    expect(controls.target.x).not.toBe(10);
    expect(controls.enabled).toBe(true);
    expect(invalidate).toHaveBeenCalled();
  });
});
