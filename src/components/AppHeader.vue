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
        <router-link to="/campus" class="header-logo" aria-label="UFCIM — Início">
          <svg class="header-logo__mark" viewBox="0 0 180 138" role="img" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <!-- "UFC" letters follow currentColor so they read on light and dark headers -->
            <g fill="currentColor">
              <path d="M103.934 63.4728C99.9848 63.4728 96.515 62.7393 93.5247 61.2724C90.5908 59.7491 88.3058 57.6333 86.6696 54.9251C85.0899 52.1605 84.3 48.9164 84.3 45.1926V18.2802C84.3 14.5 85.0899 11.2558 86.6696 8.54767C88.3058 5.83949 90.5908 3.75195 93.5247 2.28502C96.515 0.761672 99.9848 0 103.934 0C107.94 0 111.382 0.761672 114.259 2.28502C117.193 3.75195 119.478 5.83949 121.114 8.54767C122.75 11.2558 123.569 14.5 123.569 18.2802H112.905C112.905 15.3463 112.115 13.1177 110.535 11.5944C109.012 10.071 106.812 9.30934 103.934 9.30934C101.057 9.30934 98.8282 10.071 97.2484 11.5944C95.6687 13.1177 94.8788 15.3181 94.8788 18.1955V45.1926C94.8788 48.0701 95.6687 50.2987 97.2484 51.8784C98.8282 53.4018 101.057 54.1635 103.934 54.1635C106.812 54.1635 109.012 53.4018 110.535 51.8784C112.115 50.2987 112.905 48.0701 112.905 45.1926H123.569C123.569 48.86 122.75 52.0759 121.114 54.8405C119.478 57.6051 117.193 59.7491 114.259 61.2724C111.382 62.7393 107.94 63.4728 103.934 63.4728Z"/>
              <path d="M53.6314 62.6264V30.8054H40.8522V21.2421H53.6314V14.2178C53.6314 10.1555 54.9855 6.91137 57.6936 4.4853C60.4018 2.05923 63.9845 0.846191 68.4417 0.846191H82.0672V10.1555H68.6956C67.3415 10.1555 66.2413 10.5505 65.395 11.3404C64.6051 12.0738 64.2102 13.0894 64.2102 14.3871V21.2421H82.0672V30.8054H64.2102V62.6264H53.6314Z"/>
              <path d="M19.2957 63.4727C13.2588 63.4727 8.51946 61.8365 5.07782 58.5641C1.69261 55.2353 0 50.7217 0 45.0233V0.846191H10.6634V44.9386C10.6634 47.8725 11.3969 50.1575 12.8638 51.7937C14.3307 53.4299 16.4747 54.248 19.2957 54.248C22.0603 54.248 24.1761 53.4299 25.643 51.7937C27.1664 50.1575 27.928 47.8725 27.928 44.9386V0.846191H38.5915V45.0233C38.5915 50.7217 36.8989 55.2353 33.5136 58.5641C30.1284 61.8365 25.3891 63.4727 19.2957 63.4727Z"/>
            </g>
            <!-- teal isometric mark -->
            <path d="M162.1 68.0152L179.1 58.4065V78.3415L162.1 68.0152Z" fill="#00697D"/>
            <path d="M111.1 97.5803L128.1 87.7869V107.907L111.1 117.722V97.5803Z" fill="#549BA8"/>
            <path d="M145.1 58.0399L162.1 68.0182V88.1595L145.1 77.9964V58.0399Z" fill="#549BA8"/>
            <path d="M128.1 87.7835L111.1 77.99H145.1V97.5769H128.1V87.7835Z" fill="#549BA8"/>
            <path d="M77.1 98.0883V77.99L94.5247 88.0282L77.1 98.0883Z" fill="#00697D"/>
            <path d="M162.1 88.1612V68.0199L179.1 78.3462L162.1 88.1612Z" fill="#338797"/>
            <path d="M111.1 117.72V97.5787L94.5247 88.0299L77.1 98.0901L111.1 117.72Z" fill="#338797"/>
            <path d="M77.1 77.9934L111.1 97.5804L128.1 87.7869L111.1 77.9934H145.1V58.0369L162.1 68.0152L179.1 58.4065L145.1 38.45L128.1 48.4282V68.0152H94.1L77.1 77.9934Z" fill="#8ABAC3"/>
            <path d="M33.8027 95.6515L25.1 90.638L42.5054 80.6L51.2081 85.6025L33.8027 95.6515Z" fill="#8ABAC3"/>
            <path d="M33.8027 116.089L25.1 111.064L33.8027 106.04V116.089Z" fill="#338797"/>
            <path d="M33.8027 95.6535L25.1 90.64V111.061L33.8027 106.037V95.6535Z" fill="#00697D"/>
            <path d="M42.5053 90.6245L33.8026 95.649V106.032V116.081L35.8837 114.88L51.208 106.032V88.0814V85.6L42.5053 90.6245Z" fill="#549BA8"/>
            <path d="M88.1 107.028L70.6946 117.077L35.8838 96.979L53.2892 86.9299L88.1 107.028Z" fill="#8ABAC3"/>
            <path d="M35.8838 117.599V96.9777L70.6946 117.076V137.653L35.8838 117.599Z" fill="#549BA8"/>
            <path d="M88.1 107.03L70.6946 117.079L88.1 127.608V107.03Z" fill="#00697D"/>
            <path d="M70.6946 137.658L88.1 127.609L70.6946 117.08V137.658Z" fill="#338797"/>
          </svg>
        </router-link>
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
  display: inline-flex;
  align-items: center;
  /* drives the "UFC" letter paths (fill: currentColor) so they read on both themes */
  color: var(--foreground);
  text-decoration: none;
}

.header-logo__mark {
  height: 34px;
  width: auto;
  display: block;
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
  color: var(--primary);
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
  color: var(--primary);
}

.header-logout {
  padding: 0.4rem 0.8rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: none;
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--muted-foreground);
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
  background: var(--primary);
  color: var(--primary-foreground);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
  text-decoration: none;
}

.admin-link {
  color: var(--primary) !important;
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
  background: var(--destructive);
  color: var(--destructive-foreground);
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
