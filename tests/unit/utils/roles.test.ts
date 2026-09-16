import { describe, expect, it } from 'vitest';
import { forcedBlockTypeFor } from '@/utils/roles';

describe('forcedBlockTypeFor', () => {
  it('forces maintenance for the maintenance role (MEL-016)', () => {
    expect(forcedBlockTypeFor('maintenance')).toBe('maintenance');
  });

  it.each(['student', 'professor', 'staff'] as const)(
    'leaves the block type free for %s',
    (role) => {
      expect(forcedBlockTypeFor(role)).toBeNull();
    },
  );

  it('returns null without a role', () => {
    expect(forcedBlockTypeFor(null)).toBeNull();
  });
});
