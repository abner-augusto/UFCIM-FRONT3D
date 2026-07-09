import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import type { RouteLocationNormalized } from 'vue-router';
import type { User, UserRole } from '@/stores/auth';

vi.stubGlobal('sessionStorage', {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
});

import { authGuard } from '@/router/guards';
import { useAuthStore } from '@/stores/auth';
import { CAN_MANAGE_EQUIPMENT, CAN_BLOCK } from '@/utils/roles';

function makeTo(meta: Record<string, unknown> = {}): RouteLocationNormalized {
  return { meta: meta as RouteLocationNormalized['meta'] } as RouteLocationNormalized;
}

function makeStudentUser(): User {
  return {
    id: 'test-1',
    name: 'Test Student',
    email: 'test@alu.ufc.br',
    registration: '2023001001',
    role: 'student' as UserRole,
    department: 'IAUD',
    isMasterAdmin: false,
  };
}

describe('authGuard', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('redirects unauthenticated users to login on requiresAuth route', () => {
    const result = authGuard(makeTo({ requiresAuth: true }));

    expect(result).toEqual({ name: 'login' });
  });

  it('redirects student to campus-select on CAN_MANAGE_EQUIPMENT route', () => {
    const auth = useAuthStore();
    auth.setAuth('fake-token', 'fake-refresh', makeStudentUser());
    const result = authGuard(makeTo({ roles: CAN_MANAGE_EQUIPMENT }));

    expect(result).toEqual({ name: 'campus-select' });
  });

  it('redirects to campus-select when token present but user is null (BUG-006 regression)', () => {
    const auth = useAuthStore();
    auth.token = 'fake-token';
    // user stays null — simulates cold load where getMe has not yet resolved
    const result = authGuard(makeTo({ roles: CAN_MANAGE_EQUIPMENT }));

    expect(result).toEqual({ name: 'campus-select' });
  });

  it('allows professor to access CAN_BLOCK route', () => {
    const auth = useAuthStore();
    auth.setAuth('fake-token', 'fake-refresh', {
      id: 'test-2',
      name: 'Prof',
      email: 'prof@ufc.br',
      registration: '1998010001',
      role: 'professor',
      department: 'IAUD',
      isMasterAdmin: false,
    });
    const result = authGuard(makeTo({ roles: CAN_BLOCK }));

    expect(result).toBeUndefined();
  });

  it('allows navigation when no meta is set', () => {
    const result = authGuard(makeTo());

    expect(result).toBeUndefined();
  });
});
