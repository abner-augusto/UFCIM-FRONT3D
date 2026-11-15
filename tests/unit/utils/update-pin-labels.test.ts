import { expect, it, vi } from 'vitest';
import { updatePinLabels } from '@/utils/update-pin-labels';

it('yields in batches and stops when superseded', async () => {
  let current = true;
  const yieldFn = vi.fn(async () => { current = false; });
  vi.stubGlobal('scheduler', { yield: yieldFn });
  const statuses = new Map(Array.from({ length: 25 }, (_, i) => [String(i), { status: 'closed' as const, slots: [] }]));
  const update = vi.fn();
  await updatePinLabels(statuses, { startTime: '07:00', endTime: '12:00' }, '2026-01-01', update, () => current);
  expect(update).toHaveBeenCalledTimes(10);
  expect(yieldFn).toHaveBeenCalledOnce();
  vi.unstubAllGlobals();
});
