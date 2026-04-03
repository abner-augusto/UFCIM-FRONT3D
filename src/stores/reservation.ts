import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useReservationStore = defineStore('reservation', () => {
  const spaceId = ref<string | null>(null);
  const spaceName = ref<string | null>(null);
  const date = ref<string | null>(null);
  const timeSlot = ref<'morning' | 'afternoon' | 'evening' | null>(null);
  const purpose = ref<string | null>(null);

  const isReady = computed(() =>
    !!(spaceId.value && date.value && timeSlot.value && purpose.value)
  );

  function setSpace(id: string, name: string) {
    spaceId.value = id;
    spaceName.value = name;
  }

  function setSchedule(d: string, slot: 'morning' | 'afternoon' | 'evening') {
    date.value = d;
    timeSlot.value = slot;
  }

  function setPurpose(p: string) {
    purpose.value = p;
  }

  function reset() {
    spaceId.value = null;
    spaceName.value = null;
    date.value = null;
    timeSlot.value = null;
    purpose.value = null;
  }

  return { spaceId, spaceName, date, timeSlot, purpose, isReady, setSpace, setSchedule, setPurpose, reset };
});
