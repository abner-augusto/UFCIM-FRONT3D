<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useCampusStore } from '@/stores/campus';
import { useRouter } from 'vue-router';
import { usePermissions } from '@/composables/usePermissions';
import { useDarkMode } from '@/composables/useDarkMode';
import NavDrawer from './NavDrawer.vue';
import NotificationsPanel from './NotificationsPanel.vue';
import { Menu, Bell, Moon, Sun } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const authStore = useAuthStore();
const campusStore = useCampusStore();
const router = useRouter();

const drawerOpen = ref(false);
const notifOpen = ref(false);
const { isDark, toggleDarkMode } = useDarkMode();
const themeToggleLabel = computed(() => isDark.value ? 'Ativar tema claro' : 'Ativar tema escuro');

const { canBlock, canAdmin, canViewReports, canManageEquipment } = usePermissions();
const adminUrl = '/admin';
const viewerRoute = computed(() =>
  campusStore.selectedCampusId
    ? { name: 'viewer', params: { campusId: campusStore.selectedCampusId } }
    : { path: '/campus' }
);
const spaceBrowserRoute = computed(() =>
  campusStore.selectedCampusId
    ? { name: 'space-browser', params: { campusId: campusStore.selectedCampusId } }
    : { path: '/campus' }
);

function logout() {
  authStore.logout();
  router.push({ name: 'login' });
}
</script>

<template>
  <header class="app-header">
    <div class="header-content">
      <!-- Tablet Hamburger (481-1023px) -->
      <Button variant="ghost" size="icon" class="hamburger-btn" aria-label="Abrir menu" @click="drawerOpen = true"><Menu :size="24" /></Button>

      <div class="header-left">
        <router-link to="/campus" class="header-logo">UFCIM</router-link>
      </div>

      <!-- Desktop Nav (>= 1024px) -->
      <nav class="header-nav">
        <router-link :to="viewerRoute">Maquete 3D</router-link>
        <router-link :to="spaceBrowserRoute">Buscar Espaços</router-link>
        <router-link to="/minhas-reservas">Minhas Reservas</router-link>
        <router-link v-if="canBlock" to="/meus-bloqueios">Meus Bloqueios</router-link>
        <router-link v-if="canViewReports" to="/relatorios">Relatórios</router-link>
        <router-link v-if="canManageEquipment" to="/manutencao/chamados">Chamados</router-link>
        <a v-if="canAdmin" :href="adminUrl" target="_blank" rel="noopener" class="admin-link">Admin</a>
      </nav>

      <div class="header-right">
        <!-- Tablet/Desktop User Info -->
        <div class="user-info-desktop">
          <Button
            variant="ghost"
            size="icon"
            class="theme-toggle"
            :aria-label="themeToggleLabel"
            :aria-pressed="isDark"
            @click="toggleDarkMode"
          >
            <Sun v-if="isDark" :size="20" />
            <Moon v-else :size="20" />
          </Button>
          <Button variant="ghost" size="icon" class="desktop-notif" aria-label="Abrir notificações" @click="notifOpen = !notifOpen">
            <Bell :size="20" />
            <span v-if="authStore.unreadCount > 0" class="notif-badge">
              {{ authStore.unreadCount >= 100 ? '99+' : authStore.unreadCount }}
            </span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button variant="ghost" class="header-user">{{ authStore.user?.name }}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="z-[var(--z-popover)]">
              <DropdownMenuLabel>{{ authStore.user?.name }}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem @select="router.push({ name: 'profile' })">Perfil</DropdownMenuItem>
              <DropdownMenuItem @select="logout">Sair</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <!-- Mobile Actions (<= 480px) -->
        <div class="mobile-actions">
          <Button
            variant="ghost"
            size="icon"
            class="theme-toggle"
            :aria-label="themeToggleLabel"
            :aria-pressed="isDark"
            @click="toggleDarkMode"
          >
            <Sun v-if="isDark" :size="20" />
            <Moon v-else :size="20" />
          </Button>
          <Button variant="ghost" size="icon" class="mobile-notif" aria-label="Abrir notificações" @click="notifOpen = !notifOpen">
            <Bell :size="20" />
            <span v-if="authStore.unreadCount > 0" class="notif-badge">
              {{ authStore.unreadCount >= 100 ? '99+' : authStore.unreadCount }}
            </span>
          </Button>
          <router-link to="/perfil" class="mobile-avatar">
            {{ authStore.user?.name?.[0] || 'U' }}
          </router-link>
        </div>
      </div>
    </div>

    <NavDrawer :open="drawerOpen" @close="drawerOpen = false" />
    <NotificationsPanel :open="notifOpen" anchor="bottom" @close="notifOpen = false" />
  </header>
</template>

<style scoped>
.app-header {
  height: var(--header-offset);
  background: var(--background);
  border-bottom: 1px solid var(--border);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: var(--z-chrome);
  padding-top: var(--safe-top);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0 1.5rem;
  max-width: 1440px;
  margin: 0 auto;
}

.hamburger-btn {
  display: none;
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--foreground);
  cursor: pointer;
  padding: 0.5rem;
  margin-left: -0.5rem;
}

.header-logo {
  font-weight: 700;
  font-size: 1.25rem;
  color: var(--color-brand);
  text-decoration: none;
}

.header-nav {
  display: flex;
  gap: 1.5rem;
}

.header-nav a {
  text-decoration: none;
  color: var(--muted-foreground);
  font-size: 0.9rem;
  font-weight: 500;
}

.header-nav a.router-link-active {
  color: var(--color-brand);
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info-desktop {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-user {
  font-size: 0.85rem;
  color: var(--muted-foreground);
  text-decoration: none;
  max-width: 140px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-user:hover {
  color: var(--color-brand);
}

.header-logout {
  padding: 0.4rem 0.8rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: none;
  cursor: pointer;
  font-size: 0.85rem;
  color: #555;
}

.mobile-actions {
  display: none;
  align-items: center;
  gap: 1rem;
}

.mobile-notif {
  position: relative;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.25rem;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: var(--tap-min);
  min-height: var(--tap-min);
}

.theme-toggle {
  color: var(--foreground);
}

.mobile-avatar {
  width: 32px;
  height: 32px;
  background: var(--color-brand);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
  text-decoration: none;
}

.admin-link {
  color: var(--color-brand) !important;
  font-weight: 600 !important;
}

.desktop-notif {
  position: relative;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.25rem;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notif-badge {
  position: absolute;
  top: -6px;
  right: -10px;
  background: #c0392b;
  color: white;
  font-size: 0.65rem;
  font-weight: 700;
  min-width: 16px;
  height: 16px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  line-height: 1;
}

/* Responsive Tiers */

/* Tablet (481px - 1023px) */
@media (max-width: 1023px) {
  .header-nav {
    display: none;
  }
  .hamburger-btn {
    display: block;
  }
}

/* Mobile (<= 480px) */
@media (max-width: 480px) {
  .hamburger-btn {
    display: none; /* Layout 480px uses Bottom Bar, but prompt says Top bar (logo + bell + avatar) */
  }
  .user-info-desktop {
    display: none;
  }
  .mobile-actions {
    display: flex;
  }
  .header-content {
    padding: 0 1rem;
  }
}
</style>
