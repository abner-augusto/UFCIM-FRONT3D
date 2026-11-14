import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

function setup(storage: { getItem: ReturnType<typeof vi.fn>; setItem: ReturnType<typeof vi.fn>; removeItem: ReturnType<typeof vi.fn> }) {
  const listeners: Record<string, (event: { matches: boolean }) => void> = {};
  const media = { matches: true, addEventListener: vi.fn((name, callback) => { listeners[name] = callback; }) };
  const root = { classList: { toggle: vi.fn() }, style: { setProperty: vi.fn() } };
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('window', { matchMedia: vi.fn(() => media), addEventListener: vi.fn() });
  vi.stubGlobal('document', { documentElement: root, createElement: vi.fn(), querySelector: vi.fn(() => ({ setAttribute: vi.fn() })) });
  return { media, listeners, root };
}

describe('useDarkMode', () => {
  it('follows the system when storage is blocked', async () => {
    const storage = { getItem: vi.fn(() => { throw new Error('blocked'); }), setItem: vi.fn(), removeItem: vi.fn() };
    const { listeners, root } = setup(storage);
    const { useDarkMode } = await import('../../../src/composables/useDarkMode');
    expect(useDarkMode().isDark.value).toBe(true);
    listeners.change({ matches: false });
    expect(useDarkMode().isDark.value).toBe(false);
    expect(root.classList.toggle).toHaveBeenLastCalledWith('dark', false);
  });

  it('does not write on first visit and removes the preference when returning to the system theme', async () => {
    const storage = { getItem: vi.fn(() => null), setItem: vi.fn(), removeItem: vi.fn() };
    setup(storage);
    const { useDarkMode } = await import('../../../src/composables/useDarkMode');
    const theme = useDarkMode();
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
    theme.toggleDarkMode();
    expect(storage.setItem).toHaveBeenCalledWith('ufcim-theme', 'light');
    theme.toggleDarkMode();
    expect(storage.removeItem).toHaveBeenCalledWith('ufcim-theme');
  });
});
