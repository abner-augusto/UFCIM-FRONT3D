import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useCampusStore = defineStore('campus', () => {
  const selectedCampusId = ref<string | null>(sessionStorage.getItem('ufcim_campus'));

  function selectCampus(id: string) {
    selectedCampusId.value = id;
    sessionStorage.setItem('ufcim_campus', id);
  }

  function clearCampus() {
    selectedCampusId.value = null;
    sessionStorage.removeItem('ufcim_campus');
  }

  return { selectedCampusId, selectCampus, clearCampus };
});
