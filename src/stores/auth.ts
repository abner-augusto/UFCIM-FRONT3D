import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export type UserRole = 'student' | 'professor' | 'staff' | 'maintenance';

export interface User {
  id: string;
  name: string;
  email: string;
  registration: string | null;
  role: UserRole;
  isMasterAdmin: boolean;
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(sessionStorage.getItem('ufcim_token'));
  const refreshToken = ref<string | null>(sessionStorage.getItem('ufcim_refresh') ?? null);
  const user = ref<User | null>(null);
  const unreadCount = ref(0);

  const isAuthenticated = computed(() => !!token.value);
  const userRole = computed(() => user.value?.role ?? null);
  const isMasterAdmin = computed(() => user.value?.isMasterAdmin ?? false);

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
      import('@/services/api').then(({ api }) => {
        api.logout(refreshToken.value!).catch(() => {});
      });
    }
    token.value = null;
    refreshToken.value = null;
    user.value = null;
    unreadCount.value = 0;
    sessionStorage.removeItem('ufcim_token');
    sessionStorage.removeItem('ufcim_refresh');
  }

  return {
    token,
    refreshToken,
    user,
    unreadCount,
    isAuthenticated,
    userRole,
    isMasterAdmin,
    setAuth,
    setTokens,
    setUnreadCount,
    clearUnreadCount,
    logout,
  };
});
