import { expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';
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

it('does not restart availability while consecutive pin events arrive', async () => {
  let resolve!: (slots: Array<{ startTime: string; endTime: string; status: string }>) => void;
  const get = vi.spyOn(api, 'getAvailability').mockImplementation(() => new Promise(done => { resolve = done; }));
  const colors = usePinColors({
    spacesByModelId: new Map([['pin', { id: 'room' } as never]]),
    spacesLoaded: ref(true),
    token: () => null,
    selectedDate: ref('2026-01-01'),
    selectedPeriod: ref('morning'),
    periodRange: ref({ startTime: '07:00', endTime: '12:00' }),
    viewer: () => null,
    trayOpen: [ref(false), ref(false)],
  });
  const pending = colors.applyPinColors();
  colors.pinsLoaded();
  colors.pinsLoaded();
  expect(get).toHaveBeenCalledOnce();
  resolve([{ startTime: '07:00', endTime: '08:00', status: 'available' }]);
  await pending;
  vi.restoreAllMocks();
});

it('keeps the next-date search running when more pins load', async () => {
  let finish!: (slots: Array<{ startTime: string; endTime: string; status: string }>) => void;
  const reserved = [{ startTime: '07:00', endTime: '08:00', status: 'reserved' }];
  const get = vi.spyOn(api, 'getAvailability').mockImplementation((_token, _id, date) =>
    date === '2026-01-01' ? Promise.resolve(reserved) : new Promise(done => { finish = done; }),
  );
  const colors = usePinColors({
    spacesByModelId: new Map([['pin', { id: 'room' } as never]]),
    spacesLoaded: ref(true),
    token: () => null,
    selectedDate: ref('2026-01-01'),
    selectedPeriod: ref('morning'),
    periodRange: ref({ startTime: '07:00', endTime: '12:00' }),
    viewer: () => null,
    trayOpen: [ref(false), ref(false)],
  });
  await colors.applyPinColors();
  await vi.waitFor(() => expect(get).toHaveBeenCalledTimes(2));
  const signal = get.mock.calls[1][3]?.signal;
  colors.pinsLoaded();
  colors.pinsLoaded();
  expect(signal?.aborted).toBe(false);
  expect(get).toHaveBeenCalledTimes(2);
  finish([{ startTime: '07:00', endTime: '08:00', status: 'available' }]);
  await vi.waitFor(() => expect(colors.getStatus('pin')?.nextAvailableDate).toBe('2026-01-02'));
  vi.restoreAllMocks();
});

it('refetches and recolors the pin when the reservation tray closes', async () => {
  const available = [{ startTime: '07:00', endTime: '08:00', status: 'available' }];
  const partial = [
    ...available,
    { startTime: '08:00', endTime: '09:00', status: 'reserved' },
  ];
  const get = vi.spyOn(api, 'getAvailability').mockResolvedValueOnce(available).mockResolvedValueOnce(partial);
  const viewer = { applyBackendFilter: vi.fn(), updatePinLabelStatus: vi.fn() };
  const reservationOpen = ref(true);
  const colors = usePinColors({
    spacesByModelId: new Map([['pin', { id: 'room' } as never]]),
    spacesLoaded: ref(true),
    token: () => null,
    selectedDate: ref('2026-01-01'),
    selectedPeriod: ref('morning'),
    periodRange: ref({ startTime: '07:00', endTime: '12:00' }),
    viewer: () => viewer,
    trayOpen: [reservationOpen, ref(false)],
  });
  await colors.applyPinColors();
  expect(viewer.applyBackendFilter).toHaveBeenLastCalledWith(new Set(['pin']), new Map([['pin', '#00b050']]));
  reservationOpen.value = false;
  await nextTick();
  await vi.waitFor(() => expect(viewer.applyBackendFilter).toHaveBeenLastCalledWith(
    new Set(['pin']), new Map([['pin', '#f2c200']]),
  ));
  expect(get).toHaveBeenCalledTimes(2);
  expect(colors.getStatus('pin')?.status).toBe('partial');
  vi.restoreAllMocks();
});
