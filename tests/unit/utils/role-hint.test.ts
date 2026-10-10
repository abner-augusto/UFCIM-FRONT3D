import { describe, expect, it } from 'vitest';
import { dismissRoleHint, isRoleHintDismissed, roleHintKey, ROLE_HINT_VERSION } from '@/utils/role-hint';

function memoryStorage(): Pick<Storage, 'getItem' | 'setItem'> {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

function throwingStorage(): Pick<Storage, 'getItem' | 'setItem'> {
  return {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
  };
}

describe('roleHintKey', () => {
  it('namespaces the key by role and version', () => {
    expect(roleHintKey('maintenance')).toBe(`ufcim:role-hint:maintenance:v${ROLE_HINT_VERSION}`);
    expect(ROLE_HINT_VERSION).toBe(1);
  });

  it('gives each role its own key', () => {
    expect(roleHintKey('student')).not.toBe(roleHintKey('professor'));
  });
});

describe('role hint dismissal', () => {
  it('is not dismissed on first access', () => {
    expect(isRoleHintDismissed('student', memoryStorage())).toBe(false);
  });

  it('stays dismissed after dismissing', () => {
    const storage = memoryStorage();
    dismissRoleHint('student', storage);
    expect(isRoleHintDismissed('student', storage)).toBe(true);
  });

  it('dismisses per role, so a different role still sees its hint', () => {
    const storage = memoryStorage();
    dismissRoleHint('student', storage);
    expect(isRoleHintDismissed('maintenance', storage)).toBe(false);
  });

  it('ignores a dismissal stored under an older version', () => {
    const storage = memoryStorage();
    storage.setItem('ufcim:role-hint:student:v0', '1');
    expect(isRoleHintDismissed('student', storage)).toBe(false);
  });

  it('treats unavailable storage as not dismissed and does not throw', () => {
    const storage = throwingStorage();
    expect(isRoleHintDismissed('student', storage)).toBe(false);
    expect(() => dismissRoleHint('student', storage)).not.toThrow();
  });
});
