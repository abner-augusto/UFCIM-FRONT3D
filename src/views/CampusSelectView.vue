<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useCampusStore } from '@/stores/campus';
import { campuses } from '@/data/campuses';
import CampusCard from '@/components/CampusCard.vue';

const router = useRouter();
const campusStore = useCampusStore();

function handleSelect(campusId: string) {
  campusStore.selectCampus(campusId);
  router.push({ name: 'viewer', params: { campusId } });
}
</script>

<template>
  <div class="campus-select">
    <div class="campus-select__header">
      <h1>Selecione seu campus</h1>
      <p>Escolha o campus para visualizar e reservar espaços</p>
    </div>
    <div class="campus-select__grid">
      <CampusCard
        v-for="campus in campuses"
        :key="campus.id"
        :campus="campus"
        @select="handleSelect"
      />
    </div>
  </div>
</template>

<style scoped>
.campus-select {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem 1rem;
}
.campus-select__header {
  text-align: center;
  margin-bottom: 2rem;
}
.campus-select__header h1 {
  margin: 0 0 0.5rem;
  font-size: 1.5rem;
}
.campus-select__header p {
  margin: 0;
  color: #666;
}
.campus-select__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
}
</style>
