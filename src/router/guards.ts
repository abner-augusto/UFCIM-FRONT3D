import type { RouteLocationNormalized } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { hasRole } from '@/utils/roles';
import type { UserRole } from '@/stores/auth';

/** Wait for session hydration before checking authentication and roles. */
export async function authGuard(to: RouteLocationNormalized) {
  const auth = useAuthStore();
  await auth.hydrate();

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' };
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: 'campus-select' };
  }

  if (to.meta.roles && !hasRole(auth.userRole, to.meta.roles as UserRole[])) {
    return { name: 'campus-select' };
  }
}
