import { expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { usePinColors } from '@/composables/usePinColors';
import { api } from '@/services/api';

it('applies the latest availability to pin colors and labels', async () => {
  vi.spyOn(api, 'getAvailability').mockResolvedValue([{ startTime: '07:00', endTime: '08:00', status: 'available' }]);
  const viewer = { applyBackendFilter: vi.fn(), updatePinLabelStatus: vi.fn() };
  const colors = usePinColors({
    spacesByModelId: new Map([['pin', { id: 'room' } as never]]),
    spacesLoaded: ref(true),
    token: () => null,
    selectedDate: ref('2026-01-01'),
    selectedPeriod: ref('morning'),
    periodRange: ref({ startTime: '07:00', endTime: '12:00' }),
    viewer: () => viewer,
    trayOpen: [ref(false), ref(false)],
  });
  await colors.applyPinColors();
  expect(viewer.applyBackendFilter).toHaveBeenCalledWith(new Set(['pin']), new Map([['pin', '#00b050']]));
  expect(viewer.updatePinLabelStatus).toHaveBeenCalledOnce();
  expect(colors.getStatus('pin')?.status).toBe('available');
  vi.restoreAllMocks();
});
