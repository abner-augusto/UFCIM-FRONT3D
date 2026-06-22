<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/services/api';
import type { Notification } from '@/types/reservation';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const props = defineProps<{
  open: boolean;
  anchor?: 'bottom' | 'top';
}>();

const emit = defineEmits<{
  close: [];
}>();

const router = useRouter();
const auth = useAuthStore();

const PREVIEW_LIMIT = 5;

const notifications = ref<Notification[]>([]);
const loading = ref(false);
const errorMsg = ref<string | null>(null);
const markingAll = ref(false);
const loaded = ref(false);

async function load() {
  if (loaded.value) return;
  loading.value = true;
  errorMsg.value = null;
  try {
    notifications.value = await api.getNotifications(auth.token);
    auth.clearUnreadCount();
    loaded.value = true;
  } catch {
    errorMsg.value = 'Não foi possível carregar as notificações.';
  } finally {
    loading.value = false;
  }
}

async function markRead(id: string) {
  try {
    await api.markNotificationRead(auth.token, id);
    const n = notifications.value.find((n) => n.id === id);
    if (n) n.read = true;
  } catch {
    errorMsg.value = 'Erro ao marcar notificação como lida.';
  }
}

async function markAllRead() {
  markingAll.value = true;
  try {
    await api.markAllRead(auth.token);
    notifications.value.forEach((n) => (n.read = true));
    auth.clearUnreadCount();
  } catch {
    errorMsg.value = 'Erro ao marcar todas como lidas.';
  } finally {
    markingAll.value = false;
  }
}

const dateLabel = (iso: string) => {
  const normalized = iso ? iso.replace(' ', 'T') : '';
  const d = new Date(normalized);
  if (!normalized || isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const hasUnread = () => notifications.value.some((n) => !n.read);

const previewNotifications = computed(() => notifications.value.slice(0, PREVIEW_LIMIT));
const hasMore = computed(() => notifications.value.length > PREVIEW_LIMIT);

function viewAll() {
  emit('close');
  router.push({ name: 'notifications' });
}

function handleOpenChange(open: boolean) {
  if (!open) emit('close');
}

// Load when panel first opens
watch(() => props.open, (val) => {
  if (val) load();
});
</script>

<template>
  <component
    :is="(anchor ?? 'bottom') === 'top' ? Drawer : Sheet"
    :open="open"
    direction="bottom"
    @update:open="handleOpenChange"
  >
    <component
      :is="(anchor ?? 'bottom') === 'top' ? DrawerContent : SheetContent"
      :side="(anchor ?? 'bottom') === 'top' ? 'bottom' : 'right'"
      class="notif-panel z-[var(--z-overlay)]"
    >
        <!-- Header -->
        <component :is="(anchor ?? 'bottom') === 'top' ? DrawerHeader : SheetHeader" class="notif-panel__header">
          <component :is="(anchor ?? 'bottom') === 'top' ? DrawerTitle : SheetTitle" class="notif-panel__title">Notificações</component>
          <div class="notif-panel__header-actions">
            <Button
              v-if="hasUnread()"
              type="button"
              variant="ghost"
              class="notif-panel__mark-all"
              :disabled="markingAll"
              @click="markAllRead"
            >
              {{ markingAll ? 'Marcando...' : 'Marcar todas como lidas' }}
            </Button>
          </div>
        </component>

        <!-- Body -->
        <ScrollArea class="notif-panel__body" :class="{ 'notif-panel__body--scroll': !loading && notifications.length > 0 }">
          <div v-if="loading" class="notif-panel__state">Carregando notificações...</div>
          <div v-else-if="errorMsg" class="notif-panel__state notif-panel__state--error">{{ errorMsg }}</div>
          <div v-else-if="notifications.length === 0" class="notif-panel__state notif-panel__state--empty">
            Nenhuma notificação.
          </div>
          <ul v-else class="notif-panel__list">
            <li
              v-for="n in previewNotifications"
              :key="n.id"
              class="notif-panel__item"
              :class="{ 'notif-panel__item--unread': !n.read }"
            >
              <div class="notif-panel__item-content">
                <p class="notif-panel__item-title">{{ n.title }}</p>
                <p class="notif-panel__item-message">{{ n.message }}</p>
                <p class="notif-panel__item-date">{{ dateLabel(n.createdAt) }}</p>
              </div>
              <Button
                v-if="!n.read"
                type="button"
                variant="ghost"
                class="notif-panel__mark-read"
                @click="markRead(n.id)"
              >
                Lida
              </Button>
            </li>
          </ul>
        </ScrollArea>

        <!-- Footer -->
        <div v-if="!loading && notifications.length > 0" class="notif-panel__footer">
          <Button type="button" variant="ghost" class="notif-panel__view-all" @click="viewAll">
            {{ hasMore ? `Ver todas as notificações (${notifications.length})` : 'Ver todas as notificações' }}
          </Button>
        </div>
    </component>
  </component>
</template>

<style scoped>
.notif-panel {
  background: var(--popover);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: calc(100dvh - var(--header-offset) - 1rem);
}

.notif-panel[data-vaul-drawer-direction='bottom'] {
  max-height: 70dvh;
}

.notif-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1rem 0.85rem 1.1rem;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
  gap: 0.5rem;
}

.notif-panel__title {
  font-weight: 700;
  font-size: 0.95rem;
  color: #222;
}

.notif-panel__header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.notif-panel__mark-all {
  font-size: 0.775rem;
  color: var(--color-brand);
  padding: 0;
  white-space: nowrap;
}
.notif-panel__mark-all:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.notif-panel__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.notif-panel__footer {
  border-top: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.notif-panel__view-all {
  display: block;
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 0.825rem;
  color: var(--color-brand);
  font-weight: 600;
  text-align: center;
}
.notif-panel__view-all:hover { background: #f8fffe; }

.notif-panel__state {
  padding: 2rem 1rem;
  text-align: center;
  color: #888;
  font-size: 0.875rem;
}
.notif-panel__state--error { color: #c0392b; }

.notif-panel__list {
  list-style: none;
  margin: 0;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.notif-panel__item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 0.75rem 0.875rem;
  border-radius: 8px;
  border: 1px solid #efefef;
  gap: 0.75rem;
}

.notif-panel__item--unread {
  border-color: var(--color-brand);
  background: #f8fffe;
}

.notif-panel__item-content { flex: 1; min-width: 0; }

.notif-panel__item-title {
  margin: 0 0 0.2rem;
  font-weight: 600;
  font-size: 0.85rem;
}

.notif-panel__item-message {
  margin: 0 0 0.25rem;
  color: #555;
  font-size: 0.8rem;
  word-break: break-word;
}

.notif-panel__item-date {
  margin: 0;
  color: #aaa;
  font-size: 0.72rem;
}

.notif-panel__mark-read {
  font-size: 0.725rem;
  color: var(--color-brand);
  white-space: nowrap;
  padding: 0;
  flex-shrink: 0;
  align-self: center;
}

</style>
