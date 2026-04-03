import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export type UserRole = 'student' | 'professor' | 'staff' | 'maintenance';

interface User {
  id: string;
  name: string;
  email: string;
  registration: string;
  role: UserRole;
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(sessionStorage.getItem('ufcim_token'));
  const user = ref<User | null>(null);

  const isAuthenticated = computed(() => !!token.value);
  const userRole = computed(() => user.value?.role ?? null);

  function setAuth(jwt: string, userData: User) {
    token.value = jwt;
    user.value = userData;
    sessionStorage.setItem('ufcim_token', jwt);
  }

  function logout() {
    token.value = null;
    user.value = null;
    sessionStorage.removeItem('ufcim_token');
  }

  return { token, user, isAuthenticated, userRole, setAuth, logout };
});
