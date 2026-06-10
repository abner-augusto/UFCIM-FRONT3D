<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useCampusStore } from '@/stores/campus';
import { usePermissions } from '@/composables/usePermissions';
import { Building2, Search, Calendar, Ban, BarChart3, Wrench, Bell, User, X } from 'lucide-vue-next';

defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();

const auth = useAuthStore();
const campus = useCampusStore();
const router = useRouter();

const { canBlock, canViewReports, canManageEquipment } = usePermissions();

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

function logout() {
  emit('close');
  auth.logout();
  router.push({ name: 'login' });
}

function handleLinkClick() {
  emit('close');
}
</script>

<template>
  <div class="drawer-root">
    <Transition name="fade">
      <div v-if="open" class="drawer-backdrop" @click="emit('close')"></div>
    </Transition>

    <Transition name="drawer">
      <div v-if="open" class="drawer-content">
        <div class="drawer-header">
          <span class="drawer-logo">UFCIM</span>
          <button class="close-btn" @click="emit('close')"><X :size="20" /></button>
        </div>

        <nav class="drawer-nav">
          <router-link :to="viewerTarget" class="nav-item" @click="handleLinkClick">
            <span class="nav-icon"><Building2 :size="20" /></span> Maquete 3D
          </router-link>
          
          <router-link :to="browserTarget" class="nav-item" @click="handleLinkClick">
            <span class="nav-icon"><Search :size="20" /></span> Buscar Espaços
          </router-link>

          <router-link to="/minhas-reservas" class="nav-item" @click="handleLinkClick">
            <span class="nav-icon"><Calendar :size="20" /></span> Minhas Reservas
          </router-link>

          <router-link v-if="canBlock" to="/meus-bloqueios" class="nav-item" @click="handleLinkClick">
            <span class="nav-icon"><Ban :size="20" /></span> Meus Bloqueios
          </router-link>

          <router-link v-if="canViewReports" to="/relatorios" class="nav-item" @click="handleLinkClick">
            <span class="nav-icon"><BarChart3 :size="20" /></span> Relatórios
          </router-link>

          <router-link v-if="canManageEquipment" to="/manutencao/chamados" class="nav-item" @click="handleLinkClick">
            <span class="nav-icon"><Wrench :size="20" /></span> Chamados de Manutenção
          </router-link>

          <router-link to="/notificacoes" class="nav-item" @click="handleLinkClick">
            <span class="nav-icon"><Bell :size="20" /></span> Notificações
            <span v-if="auth.unreadCount > 0" class="notif-badge">
              {{ auth.unreadCount >= 100 ? '99+' : auth.unreadCount }}
            </span>
          </router-link>

          <router-link to="/perfil" class="nav-item" @click="handleLinkClick">
            <span class="nav-icon"><User :size="20" /></span> Perfil
          </router-link>
        </nav>

        <div class="drawer-footer">
          <div class="user-info">
            <div class="user-avatar">{{ auth.user?.name?.[0] || 'U' }}</div>
            <span class="user-name">{{ auth.user?.name }}</span>
          </div>
          <button class="logout-btn" @click="logout">Sair</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.drawer-root {
  position: relative;
  z-index: 2000;
}

.drawer-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100dvh;
  background: rgba(0, 0, 0, 0.5);
}

.drawer-content {
  position: fixed;
  top: 0;
  left: 0;
  width: min(280px, 85vw);
  height: 100dvh;
  background: white;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
}

.drawer-header {
  height: var(--top-bar-h);
  padding: 0 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #eee;
  padding-top: var(--safe-top);
}

.drawer-logo {
  font-weight: 700;
  font-size: 1.25rem;
  color: var(--color-brand);
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #777;
  cursor: pointer;
  padding: 0.5rem;
}

.drawer-nav {
  flex: 1;
  padding: 1rem 0;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 0.8rem 1.5rem;
  text-decoration: none;
  color: #444;
  font-size: 1rem;
  gap: 12px;
  position: relative;
}

.nav-item.router-link-active {
  color: var(--color-brand);
  background: var(--color-brand-soft);
  font-weight: 500;
}

.nav-icon {
  font-size: 1.2rem;
  width: 24px;
  text-align: center;
}

.notif-badge {
  margin-left: auto;
  background: #c0392b;
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  min-width: 18px;
  height: 18px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
}

.drawer-footer {
  padding: 1.5rem;
  border-top: 1px solid #eee;
  padding-bottom: calc(1.5rem + var(--safe-bottom));
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 1rem;
}

.user-avatar {
  width: 36px;
  height: 36px;
  background: var(--color-brand);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.1rem;
}

.user-name {
  font-size: 0.95rem;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.logout-btn {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
  color: #c0392b;
  font-weight: 600;
  cursor: pointer;
}

/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.drawer-enter-active, .drawer-leave-active { transition: transform 0.25s ease; }
.drawer-enter-from, .drawer-leave-to { transform: translateX(-100%); }
</style>
