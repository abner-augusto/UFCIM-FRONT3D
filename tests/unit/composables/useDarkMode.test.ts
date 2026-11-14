import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

function setup(storage: { getItem: ReturnType<typeof vi.fn>; setItem: ReturnType<typeof vi.fn>; removeItem: ReturnType<typeof vi.fn> }) {
  const listeners: Record<string, (event: { matches: boolean }) => void> = {};
  const windowListeners: Record<string, (event: { key: string | null; newValue: string | null }) => void> = {};
  const media = { matches: true, addEventListener: vi.fn((name, callback) => { listeners[name] = callback; }) };
  const root = { classList: { toggle: vi.fn() }, style: { setProperty: vi.fn() } };
  vi.stubGlobal('localStorage', storage);
  const setAttribute = vi.fn();
  vi.stubGlobal('window', { matchMedia: vi.fn(() => media), addEventListener: vi.fn((name, callback) => { windowListeners[name] = callback; }) });
  vi.stubGlobal('document', { documentElement: root, createElement: vi.fn(), querySelector: vi.fn(() => ({ setAttribute })) });
  return { media, listeners, windowListeners, root, setAttribute };
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

  it('syncs storage changes and updates the browser theme color', async () => {
    const storage = { getItem: vi.fn(() => 'light'), setItem: vi.fn(), removeItem: vi.fn() };
    const { media, windowListeners, setAttribute } = setup(storage);
    const { useDarkMode, DARK_THEME_COLOR, LIGHT_THEME_COLOR } = await import('../../../src/composables/useDarkMode');
    const theme = useDarkMode();
    expect(setAttribute).toHaveBeenLastCalledWith('content', LIGHT_THEME_COLOR);
    windowListeners.storage({ key: 'ufcim-theme', newValue: 'dark' });
    expect(theme.isDark.value).toBe(true);
    expect(setAttribute).toHaveBeenLastCalledWith('content', DARK_THEME_COLOR);
    media.matches = false;
    windowListeners.storage({ key: 'ufcim-theme', newValue: null });
    expect(theme.isDark.value).toBe(false);
    expect(setAttribute).toHaveBeenLastCalledWith('content', LIGHT_THEME_COLOR);
    media.matches = true;
    windowListeners.storage({ key: null, newValue: null });
    expect(theme.isDark.value).toBe(true);
    expect(setAttribute).toHaveBeenLastCalledWith('content', DARK_THEME_COLOR);
  });
});
