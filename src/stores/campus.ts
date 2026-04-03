import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useCampusStore = defineStore('campus', () => {
  const selectedCampusId = ref<string | null>(null);

  function selectCampus(id: string) {
    selectedCampusId.value = id;
  }

  function clearCampus() {
    selectedCampusId.value = null;
  }

  return { selectedCampusId, selectCampus, clearCampus };
});
