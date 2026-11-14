import { afterEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { effectScope } from 'vue';
import { api } from '@/services/api';
import { AIR_QUALITY_REFRESH_MS, useAirQuality } from '@/composables/useAirQuality';

vi.mock('vue', async (importOriginal) => ({
  ...await importOriginal<typeof import('vue')>(),
  onUnmounted: vi.fn(),
}));

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('pausa as consultas com a aba oculta e retoma ao voltar', async () => {
  vi.useFakeTimers();
  const document = new EventTarget() as EventTarget & { hidden: boolean };
  document.hidden = true;
  vi.stubGlobal('document', document);
  vi.stubGlobal('sessionStorage', { getItem: () => null });
  setActivePinia(createPinia());
  const getAir = vi.spyOn(api, 'getSpaceAirQuality').mockResolvedValue(null as never);
  const scope = effectScope();
  scope.run(() => useAirQuality('sala'));
  await vi.advanceTimersByTimeAsync(AIR_QUALITY_REFRESH_MS);
  expect(getAir).not.toHaveBeenCalled();
  document.hidden = false;
  document.dispatchEvent(new Event('visibilitychange'));
  expect(getAir).toHaveBeenCalledOnce();
  scope.stop();
  vi.clearAllTimers();
});
