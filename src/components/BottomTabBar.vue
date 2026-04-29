<script setup lang="ts">
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useCampusStore } from '@/stores/campus';

const auth = useAuthStore();
const campus = useCampusStore();
const router = useRouter();
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

const isActive = (name: string) => route.name === name;
</script>

<template>
  <nav class="bottom-tab-bar">
    <router-link :to="viewerTarget" class="tab-item" :class="{ 'active': isActive('viewer') }">
      <span class="tab-icon">🏛</span>
      <span class="tab-label">Maquete 3D</span>
    </router-link>

    <router-link :to="browserTarget" class="tab-item" :class="{ 'active': isActive('space-browser') }">
      <span class="tab-icon">🔍</span>
      <span class="tab-label">Buscar</span>
    </router-link>

    <router-link to="/minhas-reservas" class="tab-item" :class="{ 'active': isActive('my-reservations') }">
      <span class="tab-icon">📅</span>
      <span class="tab-label">Reservas</span>
    </router-link>

    <router-link to="/notificacoes" class="tab-item" :class="{ 'active': isActive('notifications') }">
      <div class="icon-wrapper">
        <span class="tab-icon">🔔</span>
        <span v-if="auth.unreadCount > 0" class="notif-badge">
          {{ auth.unreadCount >= 100 ? '99+' : auth.unreadCount }}
        </span>
      </div>
      <span class="tab-label">Notificações</span>
    </router-link>

    <router-link to="/perfil" class="tab-item" :class="{ 'active': isActive('profile') }">
      <span class="tab-icon">👤</span>
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

.icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notif-badge {
  position: absolute;
  top: -4px;
  right: -8px;
  background: #c0392b;
  color: white;
  font-size: 0.6rem;
  font-weight: 700;
  min-width: 14px;
  height: 14px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
  line-height: 1;
}
</style>
