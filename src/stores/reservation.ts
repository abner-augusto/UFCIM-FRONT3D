import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { TIME_SLOT_RANGES } from '@/types/reservation';
import type { TimeSlot } from '@/types/reservation';

export const useReservationStore = defineStore('reservation', () => {
  const spaceId = ref<string | null>(null);
  const spaceName = ref<string | null>(null);
  const date = ref<string | null>(null);
  const selectedSlot = ref<TimeSlot | null>(null);
  const startTime = ref<string | null>(null);
  const endTime = ref<string | null>(null);
  const purpose = ref<string | null>(null);

  const isReady = computed(() =>
    !!(spaceId.value && date.value && selectedSlot.value && purpose.value)
  );

  function setSpace(id: string, name: string) {
    spaceId.value = id;
    spaceName.value = name;
  }

  function setSchedule(d: string, slot: TimeSlot) {
    date.value = d;
    selectedSlot.value = slot;
    startTime.value = TIME_SLOT_RANGES[slot].startTime;
    endTime.value = TIME_SLOT_RANGES[slot].endTime;
  }

  function setPurpose(p: string) {
    purpose.value = p;
  }

  function reset() {
    spaceId.value = null;
    spaceName.value = null;
    date.value = null;
    selectedSlot.value = null;
    startTime.value = null;
    endTime.value = null;
    purpose.value = null;
  }

  return {
    spaceId, spaceName, date,
    selectedSlot, startTime, endTime,
    purpose, isReady,
    setSpace, setSchedule, setPurpose, reset,
  };
});
