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
import { api } from '@/services/api';
import { CAN_MANAGE_EQUIPMENT, CAN_BLOCK, CAN_RESERVE, CAN_VIEW_MAINTENANCE_HISTORY } from '@/utils/roles';

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

  it('redirects unauthenticated users to login on requiresAuth route', async () => {
    const result = await authGuard(makeTo({ requiresAuth: true }));

    expect(result).toEqual({ name: 'login' });
  });

  it('redirects student to campus-select on CAN_MANAGE_EQUIPMENT route', async () => {
    const auth = useAuthStore();
    auth.setAuth('fake-token', 'fake-refresh', makeStudentUser());
    const result = await authGuard(makeTo({ roles: CAN_MANAGE_EQUIPMENT }));

    expect(result).toEqual({ name: 'campus-select' });
  });

  it('redirects maintenance away from the CAN_RESERVE route (MEL-020)', async () => {
    const auth = useAuthStore();
    auth.setAuth('fake-token', 'fake-refresh', { ...makeStudentUser(), role: 'maintenance' as UserRole });
    const result = await authGuard(makeTo({ requiresAuth: true, roles: CAN_RESERVE }));

    expect(result).toEqual({ name: 'campus-select' });
  });

  it('waits for hydration before checking the user role', async () => {
    const auth = useAuthStore();
    auth.token = 'fake-token';
    let resolve!: (value: Awaited<ReturnType<typeof api.getMe>>) => void;
    vi.spyOn(api, 'getMe').mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    const navigation = authGuard(makeTo({ requiresAuth: true, roles: CAN_RESERVE }));
    expect(auth.user).toBeNull();
    resolve({ ...makeStudentUser(), unreadCount: 2 });
    expect(await navigation).toBeUndefined();
    expect(auth.user?.role).toBe('student');
    expect(auth.user).not.toHaveProperty('unreadCount');
    expect(auth.unreadCount).toBe(2);
  });

  it('redirects to login when hydration fails on a protected route', async () => {
    const auth = useAuthStore();
    auth.token = 'fake-token';
    vi.spyOn(api, 'getMe').mockRejectedValueOnce(new Error('offline'));
    expect(await authGuard(makeTo({ requiresAuth: true, roles: CAN_RESERVE }))).toEqual({ name: 'login' });
  });

  it('allows professor to access CAN_BLOCK route', async () => {
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
    const result = await authGuard(makeTo({ roles: CAN_BLOCK }));

    expect(result).toBeUndefined();
  });

  it.each([
    ['student', { name: 'campus-select' }],
    ['professor', { name: 'campus-select' }],
    ['staff', undefined],
    ['maintenance', undefined],
  ] as const)('maintenance history route (MEL-013): %s → %o', async (role, expected) => {
    const auth = useAuthStore();
    auth.setAuth('fake-token', 'fake-refresh', { ...makeStudentUser(), role });
    const result = await authGuard(makeTo({ roles: CAN_VIEW_MAINTENANCE_HISTORY }));

    expect(result).toEqual(expected);
  });

  it('allows navigation when no meta is set', async () => {
    const result = await authGuard(makeTo());

    expect(result).toBeUndefined();
  });
});
