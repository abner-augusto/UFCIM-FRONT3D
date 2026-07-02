import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { api } from '@/services/api';
import { useNotifications } from '@/composables/useNotifications';
import { useAuthStore } from '@/stores/auth';
import type { Notification } from '@/types/reservation';

vi.mock('@/services/api', () => ({
  api: {
    getNotifications: vi.fn(),
    markNotificationRead: vi.fn(),
    markAllRead: vi.fn(),
  },
  setUnauthorizedHandler: vi.fn(),
}));

const mockedApi = vi.mocked(api);

function notification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'notification-1',
    userId: 'user-1',
    title: 'Reserva aprovada',
    message: 'Sua reserva foi aprovada.',
    type: 'reservation',
    read: false,
    createdAt: '2026-07-01 14:30',
    updatedAt: '2026-07-01 14:30',
    ...overrides,
  };
}

describe('useNotifications', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('load success populates notifications, clears errors, and toggles loading', async () => {
    const loaded = [notification()];
    mockedApi.getNotifications.mockResolvedValue(loaded);
    const notifications = useNotifications();

    const promise = notifications.load();
    expect(notifications.loading.value).toBe(true);
    await promise;

    expect(notifications.notifications.value).toEqual(loaded);
    expect(notifications.errorMsg.value).toBeNull();
    expect(notifications.loading.value).toBe(false);
  });

  it('load failure sets the pt-BR error message', async () => {
    mockedApi.getNotifications.mockRejectedValue(new Error('network'));
    const notifications = useNotifications();

    await notifications.load();

    expect(notifications.errorMsg.value).toBe('Não foi possível carregar as notificações.');
    expect(notifications.loading.value).toBe(false);
  });

  it('markRead flips only the matching notification', async () => {
    mockedApi.markNotificationRead.mockResolvedValue(undefined);
    const notifications = useNotifications();
    notifications.notifications.value = [
      notification({ id: 'notification-1', read: false }),
      notification({ id: 'notification-2', read: false }),
    ];

    await notifications.markRead('notification-1');

    expect(notifications.notifications.value[0].read).toBe(true);
    expect(notifications.notifications.value[1].read).toBe(false);
  });

  it('markAllRead flips all notifications and clears unread count', async () => {
    mockedApi.markAllRead.mockResolvedValue(undefined);
    const auth = useAuthStore();
    const clearUnreadCount = vi.spyOn(auth, 'clearUnreadCount');
    const notifications = useNotifications();
    notifications.notifications.value = [
      notification({ id: 'notification-1', read: false }),
      notification({ id: 'notification-2', read: false }),
    ];

    await notifications.markAllRead();

    expect(notifications.notifications.value.every((n) => n.read)).toBe(true);
    expect(clearUnreadCount).toHaveBeenCalledOnce();
    expect(notifications.markingAll.value).toBe(false);
  });

  it('dateLabel formats normalized pt-BR datetimes and rejects empty values', () => {
    const notifications = useNotifications();

    expect(notifications.dateLabel('2026-07-01 14:30')).toMatch(/01 de jul\. de 2026, 14:30/);
    expect(notifications.dateLabel('')).toBe('—');
  });
});
