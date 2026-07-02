import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/services/api';
import type { Notification } from '@/types/reservation';

/**
 * Shared notification state and actions for the full page and header panel.
 */
export function useNotifications() {
  const auth = useAuthStore();

  const notifications = ref<Notification[]>([]);
  const loading = ref(false);
  const errorMsg = ref<string | null>(null);
  const markingAll = ref(false);

  async function load() {
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

  return { notifications, loading, errorMsg, markingAll, load, markRead, markAllRead, dateLabel, hasUnread };
}
