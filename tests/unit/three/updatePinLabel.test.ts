import { describe, expect, it, vi } from 'vitest';
import { updatePinLabel } from '../../../src/three/updatePinLabel.js';

describe('pin label updates', () => {
  it('reuses an unchanged label and invalidates rendering on change', () => {
    const oldTexture = { dispose: vi.fn() };
    const sprite = { material: { map: oldTexture }, userData: { baseDisplayName: 'Sala', labelKey: 'old' }, scale: { set: vi.fn() } };
    const factory = { _getLabelCacheKey: vi.fn(() => 'new'), getLabelTexture: vi.fn(() => ({ canvas: { width: 20, height: 10 }, texture: {} })) };
    const manager = { labelsById: new Map([['id', sprite]]), pinFactory: factory, onChange: vi.fn() };
    updatePinLabel(manager, 'missing', null, null);
    updatePinLabel(manager, 'id', 'Livre', '#fff');
    updatePinLabel(manager, 'id', 'Livre', '#fff');
    expect(factory.getLabelTexture).toHaveBeenCalledTimes(1);
    expect(oldTexture.dispose).toHaveBeenCalledOnce();
    expect(manager.onChange).toHaveBeenCalledOnce();
  });
});
