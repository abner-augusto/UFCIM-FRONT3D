import { useAuthStore, type UserRole } from '@/stores/auth';
import { api } from '@/services/api';

let pending: Promise<void> | undefined;

export function restoreSession(): Promise<void> {
  const auth = useAuthStore();
  if (!auth.token || auth.user) return Promise.resolve();
  if (pending) return pending;
  pending = (async () => {
    try {
      const me = await api.getMe(auth.token);
      if (auth.token) auth.setAuth(auth.token, auth.refreshToken ?? 'dev', { ...me, role: me.role as UserRole }, me.unreadCount ?? 0);
    } catch {
      auth.logout();
    }
  })().finally(() => { pending = undefined; });
  return pending;
}
