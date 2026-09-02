import { describe, expect, it } from 'vitest';
import { buildPinStatusLabel } from '@/composables/usePinStatusLabel';

const evening = { startTime: '19:00', endTime: '22:00' };

function makeSlots(overrides: Record<string, string> = {}) {
  return Array.from({ length: 24 }, (_, hour) => ({
    startTime: `${String(hour).padStart(2, '0')}:00`,
    endTime: hour === 23 ? '24:00' : `${String(hour + 1).padStart(2, '0')}:00`,
    status: overrides[`${String(hour).padStart(2, '0')}:00`] ?? (hour >= 22 || hour < 7 ? 'closed' : 'available'),
  }));
}

describe('buildPinStatusLabel', () => {
  it('shows the next free hour after the reserved slot in 24-hour format', () => {
    const slots = makeSlots({ '20:00': 'reserved' });

    expect(buildPinStatusLabel('partial', slots, evening).statusText).toBe('até 21h');
  });

  it('shows the next available slot when the selected period is fully reserved', () => {
    const slots = makeSlots({ '07:00': 'reserved', '08:00': 'reserved', '09:00': 'reserved', '10:00': 'reserved', '11:00': 'reserved' });

    expect(buildPinStatusLabel('reserved', slots, { startTime: '07:00', endTime: '12:00' }).statusText).toBe('até 12h');
  });

  it('shows relative or numeric date when the next available day is provided', () => {
    const slots = makeSlots({
      '07:00': 'reserved', '08:00': 'reserved', '09:00': 'reserved', '10:00': 'reserved', '11:00': 'reserved',
      '13:00': 'reserved', '14:00': 'reserved', '15:00': 'reserved', '16:00': 'reserved', '17:00': 'reserved',
      '19:00': 'reserved', '20:00': 'reserved', '21:00': 'reserved',
    });
    const options = { selectedDate: '2026-09-20', nextAvailableDate: '2026-09-21' };

    expect(buildPinStatusLabel('reserved', slots, evening, options).statusText).toBe('até amanhã');
    expect(buildPinStatusLabel('reserved', slots, evening, {
      ...options,
      nextAvailableDate: '2026-09-22',
    }).statusText).toBe('até 22/09');
  });
});
