import type { UserRole } from '@/stores/auth';

export type { UserRole };

export const CAN_RESERVE: UserRole[] = ['student', 'professor', 'staff'];
export const CAN_CREATE_RECURRING: UserRole[] = ['professor', 'staff'];
export const CAN_BLOCK: UserRole[] = ['professor', 'staff', 'maintenance'];
export const CAN_MANAGE_EQUIPMENT: UserRole[] = ['staff', 'maintenance'];
export const CAN_ADMIN: UserRole[] = ['staff'];
export const CAN_VIEW_REPORTS: UserRole[] = ['professor', 'staff', 'maintenance'];

export function hasRole(userRole: UserRole | null, allowed: UserRole[]): boolean {
  if (!userRole) return false;
  return allowed.includes(userRole);
}

/**
 * Blocking type a role is required to use. The maintenance team only creates
 * maintenance blockings; every other role chooses freely (null = free choice).
 * Mirrors the backend rule in `BlockingService.create`.
 */
export function forcedBlockTypeFor(userRole: UserRole | null): 'maintenance' | null {
  return userRole === 'maintenance' ? 'maintenance' : null;
}
