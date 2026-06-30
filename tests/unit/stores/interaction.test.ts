import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useInteractionStore } from '@/stores/interaction';
import type { InteractionSubject } from '@/stores/interaction';

const subject: InteractionSubject = {
  campusId: 'benfica',
  spaceId: 'space-1',
  modelId: 'model-1',
  spaceName: 'Sala 1',
  origin: 'viewer',
};

describe('useInteractionStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('sets the subject', () => {
    const store = useInteractionStore();

    store.setSubject(subject);

    expect(store.subject).toEqual(subject);
  });

  it('merges schedule fields onto an existing subject', () => {
    const store = useInteractionStore();
    store.setSubject(subject);

    store.updateSchedule({
      date: '2026-07-01',
      startTime: '08:00',
      endTime: '10:00',
    });

    expect(store.subject).toEqual({
      ...subject,
      date: '2026-07-01',
      startTime: '08:00',
      endTime: '10:00',
    });
  });

  it('sets the reservation id', () => {
    const store = useInteractionStore();
    store.setSubject(subject);

    store.setReservation('reservation-1');

    expect(store.subject?.reservationId).toBe('reservation-1');
  });

  it('clears the subject', () => {
    const store = useInteractionStore();
    store.setSubject(subject);

    store.clear();

    expect(store.subject).toBeNull();
  });

  it('does not update schedule when subject is null', () => {
    const store = useInteractionStore();

    store.updateSchedule({
      date: '2026-07-01',
      startTime: '08:00',
      endTime: '10:00',
    });

    expect(store.subject).toBeNull();
  });

  it('does not set reservation id when subject is null', () => {
    const store = useInteractionStore();

    store.setReservation('reservation-1');

    expect(store.subject).toBeNull();
  });
});
