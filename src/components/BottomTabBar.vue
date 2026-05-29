<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useCampusStore } from '@/stores/campus';
import { hasRole, CAN_BLOCK, CAN_VIEW_REPORTS } from '@/utils/roles';
import { Building2, Search, Calendar, Ban, BarChart3, User } from 'lucide-vue-next';

const auth = useAuthStore();
const campus = useCampusStore();
const route = useRoute();

const viewerTarget = computed(() =>
  campus.selectedCampusId
    ? { name: 'viewer', params: { campusId: campus.selectedCampusId } }
    : '/campus'
);
const browserTarget = computed(() =>
  campus.selectedCampusId
    ? { name: 'space-browser', params: { campusId: campus.selectedCampusId } }
    : '/campus'
);

const canBlock = computed(() => hasRole(auth.userRole, CAN_BLOCK));
const canViewReports = computed(() => hasRole(auth.userRole, CAN_VIEW_REPORTS));
const isActive = (name: string) => route.name === name;
</script>

<template>
  <nav class="bottom-tab-bar">
    <router-link :to="viewerTarget" class="tab-item" :class="{ active: isActive('viewer') }">
      <span class="tab-icon"><Building2 :size="20" /></span>
      <span class="tab-label">Maquete 3D</span>
    </router-link>

    <router-link :to="browserTarget" class="tab-item" :class="{ active: isActive('space-browser') }">
      <span class="tab-icon"><Search :size="20" /></span>
      <span class="tab-label">Buscar</span>
    </router-link>

    <router-link to="/minhas-reservas" class="tab-item" :class="{ active: isActive('my-reservations') }">
      <span class="tab-icon"><Calendar :size="20" /></span>
      <span class="tab-label">Reservas</span>
    </router-link>

    <router-link v-if="canBlock" to="/meus-bloqueios" class="tab-item" :class="{ active: isActive('my-blockings') }">
      <span class="tab-icon"><Ban :size="20" /></span>
      <span class="tab-label">Bloqueios</span>
    </router-link>

    <router-link v-if="canViewReports" to="/relatorios" class="tab-item" :class="{ active: isActive('reports') }">
      <span class="tab-icon"><BarChart3 :size="20" /></span>
      <span class="tab-label">Relatórios</span>
    </router-link>

    <router-link to="/perfil" class="tab-item" :class="{ active: isActive('profile') }">
      <span class="tab-icon"><User :size="20" /></span>
      <span class="tab-label">Perfil</span>
    </router-link>
  </nav>
</template>

<style scoped>
.bottom-tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(var(--bottom-bar-h) + var(--safe-bottom));
  background: white;
  border-top: 1px solid #e5e5e5;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding-bottom: var(--safe-bottom);
  z-index: 300;
}

@media (min-width: 1024px) {
  .bottom-tab-bar {
    display: none;
  }
}

.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: var(--bottom-bar-h);
  min-height: var(--tap-min);
  text-decoration: none;
  color: #777;
  gap: 2px;
  -webkit-tap-highlight-color: transparent;
}

.tab-item.active {
  color: var(--color-brand);
}

.tab-icon {
  font-size: 1.25rem;
}

.tab-label {
  font-size: 0.7rem;
  font-weight: 500;
}
</style>
