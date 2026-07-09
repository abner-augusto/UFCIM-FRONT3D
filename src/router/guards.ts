import type { RouteLocationNormalized } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { hasRole } from '@/utils/roles';
import type { UserRole } from '@/stores/auth';

/**
 * Global auth/role guard. Assumes the session has already been restored
 * before the initial navigation (see main.ts) — so a null userRole here
 * means "genuinely has no role", and role-gated routes must redirect.
 */
export function authGuard(to: RouteLocationNormalized) {
  const auth = useAuthStore();

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
