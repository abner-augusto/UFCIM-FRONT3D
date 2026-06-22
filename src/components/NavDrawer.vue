<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useCampusStore } from '@/stores/campus';
import { usePermissions } from '@/composables/usePermissions';
import { Building2, Search, Calendar, Ban, BarChart3, Wrench, Bell, User } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

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

function handleOpenChange(open: boolean) {
  if (!open) emit('close');
}
</script>

<template>
  <Sheet :open="open" @update:open="handleOpenChange">
    <SheetContent side="left" class="drawer-content z-[var(--z-overlay)]" :show-close-button="true">
        <SheetHeader class="drawer-header">
          <SheetTitle class="drawer-logo">UFCIM</SheetTitle>
        </SheetHeader>

        <ScrollArea class="drawer-nav">
        <nav>
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
        </ScrollArea>

        <div class="drawer-footer">
          <div class="user-info">
            <div class="user-avatar">{{ auth.user?.name?.[0] || 'U' }}</div>
            <span class="user-name">{{ auth.user?.name }}</span>
          </div>
          <Button variant="outline" class="logout-btn" @click="logout">Sair</Button>
        </div>
    </SheetContent>
  </Sheet>
</template>

<style scoped>
.drawer-content {
  width: min(280px, 85vw);
  background: var(--popover);
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 8px rgb(var(--shadow-color) / 0.1);
  gap: 0;
  padding: 0;
}

.drawer-header {
  height: var(--top-bar-h);
  padding: 0 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border);
  padding-top: var(--safe-top);
}

.drawer-logo {
  font-weight: 700;
  font-size: 1.25rem;
  color: var(--primary);
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
  color: var(--foreground);
  font-size: 1rem;
  gap: 12px;
  position: relative;
}

.nav-item.router-link-active {
  color: var(--primary);
  background: var(--secondary);
  font-weight: 500;
}

.nav-icon {
  font-size: 1.2rem;
  width: 24px;
  text-align: center;
}

.notif-badge {
  margin-left: auto;
  background: var(--destructive);
  color: var(--destructive-foreground);
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
  border-top: 1px solid var(--border);
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
  background: var(--primary);
  color: var(--primary-foreground);
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
  color: var(--foreground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.logout-btn {
  width: 100%;
  color: var(--destructive);
  font-weight: 600;
}
</style>
