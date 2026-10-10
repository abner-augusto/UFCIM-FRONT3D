import type { UserRole } from '@/utils/roles';

/**
 * First-access role hint (MEL-008). Dismissal lives in sessionStorage: the
 * project keeps localStorage for the theme only, so the hint returns in a new
 * session. Bump the version to show a rewritten hint again.
 */
export const ROLE_HINT_VERSION = 1;

type HintStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function roleHintKey(role: UserRole): string {
  return `ufcim:role-hint:${role}:v${ROLE_HINT_VERSION}`;
}

export function isRoleHintDismissed(role: UserRole, storage: HintStorage = sessionStorage): boolean {
  try {
    return storage.getItem(roleHintKey(role)) !== null;
  } catch {
    return false;
  }
}

export function dismissRoleHint(role: UserRole, storage: HintStorage = sessionStorage): void {
  try {
    storage.setItem(roleHintKey(role), '1');
  } catch {
    // Storage blocked (private mode): the hint just stays dismissed in memory.
  }
}
