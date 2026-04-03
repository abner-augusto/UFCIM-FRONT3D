<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/services/api';
import type { Notification } from '@/types/reservation';

const auth = useAuthStore();

const notifications = ref<Notification[]>([]);
const loading = ref(true);
const errorMsg = ref<string | null>(null);
const markingAll = ref(false);

onMounted(async () => {
  await loadNotifications();
});

async function loadNotifications() {
  loading.value = true;
  errorMsg.value = null;
  try {
    const result = await api.getNotifications(auth.token);
    notifications.value = result.data;
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
  } catch {
    errorMsg.value = 'Erro ao marcar todas como lidas.';
  } finally {
    markingAll.value = false;
  }
}

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

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

    <div v-if="loading" class="state-msg">Carregando notificações...</div>
    <div v-else-if="errorMsg" class="state-error">{{ errorMsg }}</div>
    <div v-else-if="notifications.length === 0" class="state-empty">
      <p>Nenhuma notificação.</p>
    </div>

    <ul v-else class="notification-list">
      <li
        v-for="n in notifications"
        :key="n.id"
        class="notification-item"
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
  color: #1D9E75;
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
  background: white;
  border: 1px solid #e5e5e5;
}
.notification-item--unread {
  border-left: 3px solid #1D9E75;
  background: #f8fffe;
}
.notification-item__content {
  flex: 1;
}
.notification-item__title {
  margin: 0 0 0.25rem;
  font-weight: 600;
  font-size: 0.9rem;
}
.notification-item__message {
  margin: 0 0 0.35rem;
  color: #555;
  font-size: 0.85rem;
}
.notification-item__date {
  margin: 0;
  color: #aaa;
  font-size: 0.75rem;
}
.mark-read-btn {
  font-size: 0.775rem;
  color: #1D9E75;
  background: none;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  margin-left: 1rem;
  padding: 0;
}
.state-msg { color: #888; font-size: 0.9rem; }
.state-error { color: #c0392b; font-size: 0.9rem; }
.state-empty { color: #888; font-size: 0.9rem; text-align: center; padding: 3rem 0; }
</style>
