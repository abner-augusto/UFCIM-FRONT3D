import type { UserRole } from '@/stores/auth';

export type { UserRole };

export const CAN_RESERVE: UserRole[] = ['student', 'professor', 'staff'];
export const CAN_CREATE_RECURRING: UserRole[] = ['professor', 'staff'];
export const CAN_BLOCK: UserRole[] = ['professor', 'staff', 'maintenance'];
export const CAN_MANAGE_EQUIPMENT: UserRole[] = ['staff', 'maintenance'];

export function hasRole(userRole: UserRole | null, allowed: UserRole[]): boolean {
  if (!userRole) return false;
  return allowed.includes(userRole);
}
