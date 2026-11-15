import { API_CACHE, AVAILABILITY_CACHE } from '@/utils/cache-names';
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api, setUnauthorizedHandler } from '@/services/api';
import type { PublicUser } from '@/services/api';

export type UserRole = 'student' | 'professor' | 'staff' | 'maintenance';

export interface User extends Omit<PublicUser, 'role' | 'unreadCount'> {
  role: UserRole;
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(sessionStorage.getItem('ufcim_token'));
  const refreshToken = ref<string | null>(sessionStorage.getItem('ufcim_refresh') ?? null);
  const user = ref<User | null>(null);
  const unreadCount = ref(0);

  const isAuthenticated = computed(() => !!token.value);
  const userRole = computed(() => user.value?.role ?? null);
  const isMasterAdmin = computed(() => user.value?.isMasterAdmin ?? false);

  // Register the 401 refresh handler — breaks circular dep between auth and api
  setUnauthorizedHandler(async () => {
    if (!refreshToken.value) return null;
    try {
      const { accessToken, refreshToken: newRefresh } = await api.refresh(refreshToken.value);
      setTokens(accessToken, newRefresh);
      return accessToken;
    } catch {
      logout();
      return null;
    }
  });
  let hydration: Promise<void> | undefined;
  function hydrate(): Promise<void> {
    if (!token.value || user.value) return Promise.resolve();
    if (hydration) return hydration;
    hydration = (async () => {
      try {
        const me = await api.getMe(token.value);
        if (token.value) setAuth(token.value, refreshToken.value ?? 'dev', {
          id: me.id, name: me.name, email: me.email, registration: me.registration,
          role: me.role as UserRole, department: me.department, isMasterAdmin: me.isMasterAdmin ?? false,
        }, me.unreadCount ?? 0);
      } catch {
        logout();
      }
    })().finally(() => { hydration = undefined; });
    return hydration;
  }

  function setAuth(jwt: string, refresh: string, userData: User, unread = 0) {
    token.value = jwt;
    refreshToken.value = refresh;
    user.value = userData;
    unreadCount.value = unread;
    sessionStorage.setItem('ufcim_token', jwt);
    sessionStorage.setItem('ufcim_refresh', refresh);
  }

  function setTokens(jwt: string, refresh: string) {
    token.value = jwt;
    refreshToken.value = refresh;
    sessionStorage.setItem('ufcim_token', jwt);
    sessionStorage.setItem('ufcim_refresh', refresh);
  }

  function setUnreadCount(count: number) {
    unreadCount.value = count;
  }

  function clearUnreadCount() {
    unreadCount.value = 0;
  }

  function logout() {
    // Best-effort revocation; don't block UI on it.
    if (refreshToken.value) {
      api.logout(refreshToken.value!).catch(() => {});
    }
    token.value = null;
    refreshToken.value = null;
    user.value = null;
    unreadCount.value = 0;
    sessionStorage.removeItem('ufcim_token');
    sessionStorage.removeItem('ufcim_refresh');
    if (typeof window !== 'undefined' && 'caches' in window) {
      void window.caches.delete(API_CACHE).catch(() => {});
      void window.caches.delete(AVAILABILITY_CACHE).catch(() => {});
    }
  }

  return {
    token,
    refreshToken,
    user,
    unreadCount,
    isAuthenticated,
    userRole,
    isMasterAdmin,
    hydrate,
    setAuth,
    setTokens,
    setUnreadCount,
    clearUnreadCount,
    logout,
  };
});
