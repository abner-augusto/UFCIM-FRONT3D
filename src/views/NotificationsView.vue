<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/services/api';
import type { Notification } from '@/types/reservation';
import ListItemSkeleton from '@/components/ListItemSkeleton.vue';

const auth = useAuthStore();

const notifications = ref<Notification[]>([]);
const loading = ref(true);
const errorMsg = ref<string | null>(null);
const markingAll = ref(false);

onMounted(async () => {
  auth.clearUnreadCount();
  await loadNotifications();
});

async function loadNotifications() {
  loading.value = true;
  errorMsg.value = null;
  try {
    notifications.value = await api.getNotifications(auth.token);
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
</script>

<template>
  <div class="notifications-view">
    <div class="notifications-header">
      <h1>Notificações</h1>
      <button
        v-if="hasUnread()"
        class="mark-all-btn"
        :disabled="markingAll"
        @click="markAllRead"
      >
        {{ markingAll ? 'Marcando...' : 'Marcar todas como lidas' }}
      </button>
    </div>

    <ListItemSkeleton v-if="loading" :count="5" label="Carregando notificações" />
    <div v-else-if="errorMsg" class="state-error">{{ errorMsg }}</div>
    <div v-else-if="notifications.length === 0" class="state-empty">
      <p>Você não tem notificações.</p>
    </div>

    <ul v-else class="notification-list">
      <li
        v-for="(n, i) in notifications"
        :key="n.id"
        class="notification-item stagger-item"
        :style="{ '--i': i }"
        :class="{ 'notification-item--unread': !n.read }"
      >
        <div class="notification-item__content">
          <p class="notification-item__title">{{ n.title }}</p>
          <p class="notification-item__message">{{ n.message }}</p>
          <p class="notification-item__date">{{ dateLabel(n.createdAt) }}</p>
        </div>
        <button
          v-if="!n.read"
          class="mark-read-btn"
          @click="markRead(n.id)"
        >
          Marcar como lida
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.notifications-view {
  max-width: 640px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}
.notifications-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}
.notifications-header h1 {
  margin: 0;
  font-size: 1.3rem;
}
.mark-all-btn {
  font-size: 0.825rem;
  color: var(--primary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}
.mark-all-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.notification-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.notification-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1rem 1.25rem;
  border-radius: 10px;
  background: var(--card);
  border: 1px solid var(--border);
  gap: 1rem;
}
.notification-item--unread {
  border-color: var(--primary);
  background: var(--accent);
}
.notification-item__content {
  flex: 1;
  min-width: 0;
}
.notification-item__title {
  margin: 0 0 0.25rem;
  font-weight: 600;
  font-size: 0.9rem;
}
.notification-item__message {
  margin: 0 0 0.35rem;
  color: var(--muted-foreground);
  font-size: 0.85rem;
  word-break: break-word;
}
.notification-item__date {
  margin: 0;
  color: var(--muted-foreground);
  font-size: 0.75rem;
}
.mark-read-btn {
  font-size: 0.775rem;
  color: var(--primary);
  background: none;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  padding: 0;
  flex-shrink: 0;
}

@media (max-width: 480px) {
  .notification-item {
    flex-direction: column;
    align-items: stretch;
  }
  .mark-read-btn {
    align-self: flex-end;
    margin-top: 0.5rem;
  }
}

.state-msg { color: var(--muted-foreground); font-size: 0.9rem; }
.state-error { color: var(--destructive); font-size: 0.9rem; }
.state-empty { color: var(--muted-foreground); font-size: 0.9rem; text-align: center; padding: 3rem 0; }
</style>
