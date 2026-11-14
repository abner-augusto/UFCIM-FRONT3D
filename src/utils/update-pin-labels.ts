import { buildPinStatusLabel } from '@/composables/usePinStatusLabel';
import type { PinAvailabilityData } from '@/composables/usePinAvailability';

export async function updatePinLabels(
  statuses: Map<string, PinAvailabilityData>,
  periodRange: Parameters<typeof buildPinStatusLabel>[2],
  selectedDate: string,
  update: (id: string, text: string | null, color: string | null) => void,
  current: () => boolean,
) {
  let count = 0;
  for (const [id, { status, slots, nextAvailableDate }] of statuses) {
    if (!current()) return;
    const label = buildPinStatusLabel(status, slots, periodRange, { selectedDate, nextAvailableDate });
    update(id, label.statusText, label.statusColor);
    if (++count % 10 === 0) {
      const scheduler = (globalThis as typeof globalThis & { scheduler?: { yield?: () => Promise<void> } }).scheduler;
      await (scheduler?.yield ? scheduler.yield() : new Promise<void>(resolve => setTimeout(resolve, 0)));
    }
  }
}
