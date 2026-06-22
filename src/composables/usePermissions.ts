import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import {
  hasRole,
  CAN_RESERVE,
  CAN_CREATE_RECURRING,
  CAN_BLOCK,
  CAN_MANAGE_EQUIPMENT,
  CAN_ADMIN,
  CAN_VIEW_REPORTS,
} from '@/utils/roles';

/**
 * Ready-to-use permission computeds over the current user's role.
 * UI-only convenience (the backend remains the source of truth);
 * the role→permission mapping itself lives in `@/utils/roles`.
 */
export function usePermissions() {
  const auth = useAuthStore();

  const canReserve = computed(() => hasRole(auth.userRole, CAN_RESERVE));
  const canCreateRecurring = computed(() => hasRole(auth.userRole, CAN_CREATE_RECURRING));
  const canBlock = computed(() => hasRole(auth.userRole, CAN_BLOCK));
  const canManageEquipment = computed(() => hasRole(auth.userRole, CAN_MANAGE_EQUIPMENT));
  const canAdmin = computed(() => hasRole(auth.userRole, CAN_ADMIN));
  const canViewReports = computed(() => hasRole(auth.userRole, CAN_VIEW_REPORTS));

  return { canReserve, canCreateRecurring, canBlock, canManageEquipment, canAdmin, canViewReports };
}
