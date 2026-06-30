import { defineStore } from 'pinia';
import { ref } from 'vue';

export type InteractionOrigin = 'viewer' | 'space-browser' | 'reservation-list' | 'notification' | 'deep-link';

export interface InteractionSubject {
  campusId: string;
  spaceId?: string;
  modelId?: string;
  spaceName?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  reservationId?: string;
  origin: InteractionOrigin;
}

type ScheduleUpdate = Pick<InteractionSubject, 'date' | 'startTime' | 'endTime'>;

export const useInteractionStore = defineStore('interaction', () => {
  const subject = ref<InteractionSubject | null>(null);

  function setSubject(newSubject: InteractionSubject) {
    subject.value = newSubject;
  }

  function updateSchedule(schedule: ScheduleUpdate) {
    if (!subject.value) return;

    subject.value = {
      ...subject.value,
      ...schedule,
    };
  }

  function setReservation(reservationId: string) {
    if (!subject.value) return;

    subject.value = {
      ...subject.value,
      reservationId,
    };
  }

  function clear() {
    subject.value = null;
  }

  return { subject, setSubject, updateSchedule, setReservation, clear };
});
