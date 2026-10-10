import type { UserRole } from '@/stores/auth';
import type { Reservation } from '@/types/reservation';
import { isReservationPast } from '@/utils/my-reservations';
import { hasReservationStarted } from '@/utils/reservation-edit';

export type { UserRole };

export const CAN_RESERVE: UserRole[] = ['student', 'professor', 'staff'];
export const CAN_CREATE_RECURRING: UserRole[] = ['professor', 'staff'];
export const CAN_BLOCK: UserRole[] = ['professor', 'staff', 'maintenance'];
export const CAN_MANAGE_EQUIPMENT: UserRole[] = ['staff', 'maintenance'];
export const CAN_ADMIN: UserRole[] = ['staff'];
export const CAN_VIEW_REPORTS: UserRole[] = ['professor', 'staff', 'maintenance'];
/** Equipment maintenance history (MEL-013); mirrors the backend RBAC. */
export const CAN_VIEW_MAINTENANCE_HISTORY: UserRole[] = ['staff', 'maintenance'];
/** Reserve on behalf of another person (MEL-025); mirrors the backend 403. */
export const CAN_RESERVE_ON_BEHALF: UserRole[] = ['staff'];

export function hasRole(userRole: UserRole | null, allowed: UserRole[]): boolean {
  if (!userRole) return false;
  return allowed.includes(userRole);
}

export interface ReservationActor {
  id: string;
  role: UserRole;
}

export type ReservationAction = 'edit' | 'cancel';

/**
 * Who may edit or cancel a reservation: the owner and staff, maintenance never
 * (MEL-023); the registered requester of a reservation made on their behalf
 * may cancel it but not edit it (MEL-025). Mirrors the backend
 * `canManageReservation`, which stays authoritative.
 */
export function canManageReservation(
  actor: ReservationActor | null,
  reservation: Pick<Reservation, 'userId' | 'requesterUserId'>,
  action: ReservationAction,
): boolean {
  if (!actor || actor.role === 'maintenance') return false;
  if (actor.role === 'staff' || reservation.userId === actor.id) return true;
  return action === 'cancel' && !!reservation.requesterUserId && reservation.requesterUserId === actor.id;
}

/** Editable: manageable, confirmed and not started yet. */
export function canEditReservation(actor: ReservationActor | null, reservation: Reservation, now: Date): boolean {
  return canManageReservation(actor, reservation, 'edit')
    && reservation.status === 'confirmed'
    && !hasReservationStarted(reservation, now);
}

/** Cancelable: manageable, confirmed and not over yet. */
export function canCancelReservation(actor: ReservationActor | null, reservation: Reservation, now: Date): boolean {
  return canManageReservation(actor, reservation, 'cancel')
    && reservation.status === 'confirmed'
    && !isReservationPast(reservation, now);
}

/**
 * Blocking type a role is required to use. The maintenance team only creates
 * maintenance blockings; every other role chooses freely (null = free choice).
 * Mirrors the backend rule in `BlockingService.create`.
 */
export function forcedBlockTypeFor(userRole: UserRole | null): 'maintenance' | null {
  return userRole === 'maintenance' ? 'maintenance' : null;
}
