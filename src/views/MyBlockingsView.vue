<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { hasRole, CAN_BLOCK } from '@/utils/roles';

const router = useRouter();
const auth = useAuthStore();

onMounted(() => {
  if (!hasRole(auth.userRole, CAN_BLOCK)) {
    router.replace({ name: 'campus-select' });
  }
});
</script>

<template>
  <div class="my-blockings-view">
    <div class="view-header">
      <button class="back-btn" @click="router.back()">← Voltar</button>
      <h1>Meus Bloqueios</h1>
    </div>

    <div class="placeholder-card">
      <!-- TODO: A backend endpoint GET /blockings/mine (or similar) does not exist yet.
           The current API only exposes GET /blockings/space/:spaceId.
           Once a "my blockings" endpoint is added, replace this placeholder
           with a real list fetched on mount. -->
      <p class="placeholder-text">
        Para ver seus bloqueios, acesse um espaço no visualizador.
      </p>
      <button class="viewer-btn" @click="router.push({ name: 'campus-select' })">
        Ir para o visualizador
      </button>
    </div>
  </div>
</template>

<style scoped>
.my-blockings-view {
  max-width: 640px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}
.view-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.view-header h1 {
  margin: 0;
  font-size: 1.3rem;
}
.back-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #1D9E75;
  font-size: 0.95rem;
  padding: 0;
}
.placeholder-card {
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  padding: 2rem 1.25rem;
  text-align: center;
}
.placeholder-text {
  color: #888;
  font-size: 0.95rem;
  margin: 0 0 1.25rem;
}
.viewer-btn {
  padding: 0.7rem 1.5rem;
  border: none;
  border-radius: 10px;
  background: #1D9E75;
  color: white;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
}
.viewer-btn:hover {
  background: #178a65;
}
</style>
