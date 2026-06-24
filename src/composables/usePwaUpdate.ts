import { useRegisterSW } from 'virtual:pwa-register/vue';
import { logger } from '../utils/logger';

// How often a long-lived (installed) session re-checks the server for a new
// service worker. Cloudflare only ships a new build on deploy, so a frequent
// poll would be wasteful — half an hour is plenty for an internal tool.
const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;

// Singleton — useRegisterSW registers the service worker, so it must run exactly
// once for the whole app regardless of how many components consume this.
const { needRefresh, updateServiceWorker } = useRegisterSW({
  immediate: true,
  onRegisteredSW(swUrl, registration) {
    if (!registration) return;

    const checkForUpdate = () => {
      // No point hitting the network while offline.
      if (navigator.onLine) registration.update().catch(() => { /* transient — ignore */ });
    };

    // Re-check on a timer and whenever the user returns to the app, so an
    // installed PWA that stays open for days still notices new deploys.
    setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkForUpdate();
    });
    window.addEventListener('focus', checkForUpdate);
  },
  onRegisterError(error) {
    logger.error('Service worker registration failed', error);
  },
});

/**
 * App-wide PWA update state. `needRefresh` flips to true when a new build's
 * service worker is waiting; `update()` activates it (skipWaiting) and reloads.
 * `dismiss()` hides the prompt for the current session without reloading.
 */
export function usePwaUpdate() {
  function update() {
    updateServiceWorker(true);
  }

  function dismiss() {
    needRefresh.value = false;
  }

  return { needRefresh, update, dismiss };
}
