import { afterEach, describe, expect, it, vi } from 'vitest';

interface SetupOptions {
  standalone?: boolean;
  navigatorInstall?: ReturnType<typeof vi.fn>;
  navigatorStandalone?: boolean;
}

function setup({ standalone = false, navigatorInstall, navigatorStandalone }: SetupOptions = {}) {
  const windowListeners: Record<string, Array<(event: unknown) => void>> = {};
  const mediaListeners: Record<string, Array<(event: { matches: boolean }) => void>> = {};

  const mediaQuery = {
    matches: standalone,
    addEventListener: vi.fn((name: string, callback: (event: { matches: boolean }) => void) => {
      (mediaListeners[name] ??= []).push(callback);
    }),
    removeEventListener: vi.fn(),
  };

  vi.stubGlobal('window', {
    matchMedia: vi.fn(() => mediaQuery),
    addEventListener: vi.fn((name: string, callback: (event: unknown) => void) => {
      (windowListeners[name] ??= []).push(callback);
    }),
    removeEventListener: vi.fn(),
  });

  vi.stubGlobal('navigator', {
    ...(navigatorInstall ? { install: navigatorInstall } : {}),
    ...(navigatorStandalone !== undefined ? { standalone: navigatorStandalone } : {}),
  });

  return {
    dispatchWindow(name: string, event: unknown = {}) {
      for (const listener of windowListeners[name] ?? []) listener(event);
    },
    dispatchMediaChange(matches: boolean) {
      mediaQuery.matches = matches;
      for (const listener of mediaListeners.change ?? []) listener({ matches });
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('useInstallPrompt', () => {
  it('starts with canInstall false and turns true on beforeinstallprompt, calls prompt(), and hides on appinstalled', async () => {
    const { dispatchWindow } = setup();
    const { useInstallPrompt } = await import('../../../src/composables/useInstallPrompt');
    const { canInstall, install } = useInstallPrompt();

    expect(canInstall.value).toBe(false);
    await install();

    const preventDefault = vi.fn();
    const prompt = vi.fn().mockResolvedValue({ outcome: 'accepted' });
    dispatchWindow('beforeinstallprompt', { preventDefault, prompt });

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(canInstall.value).toBe(true);

    await install();
    expect(prompt).toHaveBeenCalledOnce();
    expect(canInstall.value).toBe(false);

    dispatchWindow('beforeinstallprompt', { preventDefault: vi.fn(), prompt: vi.fn() });
    expect(canInstall.value).toBe(true);

    dispatchWindow('appinstalled');
    expect(canInstall.value).toBe(false);
  });

  it('keeps canInstall false in display-mode: standalone', async () => {
    const navigatorInstall = vi.fn().mockResolvedValue(undefined);
    const { dispatchWindow, dispatchMediaChange } = setup({ standalone: true, navigatorInstall });
    const { useInstallPrompt } = await import('../../../src/composables/useInstallPrompt');
    const { canInstall, install } = useInstallPrompt();

    expect(canInstall.value).toBe(false);

    dispatchWindow('beforeinstallprompt', { preventDefault: vi.fn(), prompt: vi.fn() });
    expect(canInstall.value).toBe(false);

    await install();
    expect(navigatorInstall).not.toHaveBeenCalled();

    dispatchMediaChange(false);
    expect(canInstall.value).toBe(true);
    dispatchMediaChange(true);
    expect(canInstall.value).toBe(false);
  });

  it('keeps canInstall false when navigator.standalone is true', async () => {
    setup({ navigatorStandalone: true });
    const { useInstallPrompt } = await import('../../../src/composables/useInstallPrompt');

    expect(useInstallPrompt().canInstall.value).toBe(false);
  });

  it('uses navigator.install() when available and keeps canInstall on AbortError', async () => {
    const abortError = Object.assign(new Error('Cancelled'), { name: 'AbortError' });
    const navigatorInstall = vi
      .fn()
      .mockRejectedValueOnce(abortError)
      .mockResolvedValueOnce(undefined);
    setup({ navigatorInstall });
    const { useInstallPrompt } = await import('../../../src/composables/useInstallPrompt');
    const { canInstall, install } = useInstallPrompt();

    expect(canInstall.value).toBe(true);

    await install();
    expect(navigatorInstall).toHaveBeenCalledTimes(1);
    expect(canInstall.value).toBe(true);

    await install();
    expect(navigatorInstall).toHaveBeenCalledTimes(2);
    expect(canInstall.value).toBe(false);
  });

  it('falls back to deferred beforeinstallprompt if navigator.install() throws a non-abort error', async () => {
    const navigatorInstall = vi.fn().mockRejectedValue(new Error('not supported'));
    const { dispatchWindow } = setup({ navigatorInstall });
    const { useInstallPrompt } = await import('../../../src/composables/useInstallPrompt');
    const { canInstall, install } = useInstallPrompt();

    const prompt = vi.fn().mockResolvedValue({ outcome: 'accepted' });
    dispatchWindow('beforeinstallprompt', { preventDefault: vi.fn(), prompt });
    expect(canInstall.value).toBe(true);

    await install();
    expect(navigatorInstall).toHaveBeenCalledOnce();
    expect(prompt).toHaveBeenCalledOnce();
    expect(canInstall.value).toBe(false);
  });
});
