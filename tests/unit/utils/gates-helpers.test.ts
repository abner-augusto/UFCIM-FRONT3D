import { expect, it } from 'vitest';
import { normalizeBlockKey } from '@/utils/normalizeBlockKey';
import { getBlockingReason } from '@/utils/getBlockingReason';

it('matches manifest block ids to backend block names', () => {
  expect(normalizeBlockKey('bloco1')).toBe(normalizeBlockKey('Bloco 1'));
});

it('includes the blocking reason when present', () => {
  expect(getBlockingReason({ blockType: 'maintenance', reason: ' reparo ' } as never)).toContain('reparo');
});
