import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';

describe('auth logout', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubGlobal('sessionStorage', {
      getItem: () => null,
      removeItem: vi.fn(),
    });
  });

  it('deletes authenticated API caches', () => {
    const deleteCache = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('window', { caches: { delete: deleteCache } });

    useAuthStore().logout();

    expect(deleteCache).toHaveBeenCalledTimes(2);
    expect(deleteCache).toHaveBeenCalledWith('api-cache');
    expect(deleteCache).toHaveBeenCalledWith('availability');
    vi.unstubAllGlobals();
  });
});
