import { computed, ref } from 'vue';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<{ outcome?: 'accepted' | 'dismissed' } | void>;
}

type InstallNavigator = Navigator & {
  install?: () => Promise<unknown>;
  standalone?: boolean;
};

const STANDALONE_MEDIA_QUERY = '(display-mode: standalone)';

function getNavigator(): InstallNavigator | undefined {
  return typeof navigator !== 'undefined' ? (navigator as InstallNavigator) : undefined;
}

function hasNavigatorInstall(): boolean {
  return typeof getNavigator()?.install === 'function';
}

function readStandalone(): boolean {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    if (window.matchMedia(STANDALONE_MEDIA_QUERY).matches) return true;
  }
  return Boolean(getNavigator()?.standalone);
}

const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null);
const isInstalled = ref(false);
const isStandalone = ref(readStandalone());

function handleBeforeInstallPrompt(event: Event) {
  event.preventDefault();
  isInstalled.value = false;
  deferredPrompt.value = event as BeforeInstallPromptEvent;
}

function handleAppInstalled() {
  isInstalled.value = true;
  deferredPrompt.value = null;
}

function handleDisplayModeChange(event: MediaQueryListEvent) {
  isStandalone.value = event.matches || Boolean(getNavigator()?.standalone);
}

const standaloneQuery =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(STANDALONE_MEDIA_QUERY)
    : null;

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  window.addEventListener('appinstalled', handleAppInstalled);
}
standaloneQuery?.addEventListener?.('change', handleDisplayModeChange);

import.meta.hot?.dispose(() => {
  if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.removeEventListener('appinstalled', handleAppInstalled);
  }
  standaloneQuery?.removeEventListener?.('change', handleDisplayModeChange);
});

const canInstall = computed(
  () =>
    !isStandalone.value &&
    !isInstalled.value &&
    (deferredPrompt.value !== null || hasNavigatorInstall()),
);

function isAbortError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'AbortError';
}

async function install(): Promise<void> {
  if (!canInstall.value) return;

  const nav = getNavigator();
  if (typeof nav?.install === 'function') {
    try {
      await nav.install();
      isInstalled.value = true;
      deferredPrompt.value = null;
      return;
    } catch (error) {
      if (isAbortError(error) || !deferredPrompt.value) return;
    }
  }

  const promptEvent = deferredPrompt.value;
  if (!promptEvent) return;

  deferredPrompt.value = null;
  const result = await promptEvent.prompt();
  if (result?.outcome === 'accepted') {
    isInstalled.value = true;
  }
}

export function useInstallPrompt() {
  return {
    canInstall,
    install,
  };
}
