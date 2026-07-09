import { describe, expect, it } from 'vitest';
import { blockLabel, blockValue, campusLabel, departmentLabel, roomLabel } from '@/utils/space-labels';

describe('blockLabel', () => {
  it('adds "Bloco" prefix when missing', () => {
    expect(blockLabel('2')).toBe('Bloco 2');
  });

  it('keeps "Bloco" when already present (BUG-007 regression)', () => {
    expect(blockLabel('Bloco 2')).toBe('Bloco 2');
  });

  it('returns null for empty input', () => {
    expect(blockLabel('')).toBeNull();
  });
});

describe('blockValue', () => {
  it('strips "Bloco" prefix', () => {
    expect(blockValue('Bloco 2')).toBe('2');
  });

  it('keeps bare block unchanged', () => {
    expect(blockValue('2')).toBe('2');
  });
});

describe('roomLabel', () => {
  it('extracts room number after dash prefix', () => {
    expect(roomLabel({ name: 'Sala de Leitura', number: 'B2-03' })).toBe('Sala 03');
  });

  it('falls back to name when number is empty', () => {
    expect(roomLabel({ name: 'Sala de Leitura', number: '' })).toBe('Sala de Leitura');
  });
});

describe('campusLabel', () => {
  it('resolves campus id to short name', () => {
    expect(campusLabel('benfica')).toBe('Benfica');
  });

  it('resolves short name to short name', () => {
    expect(campusLabel('Benfica')).toBe('Benfica');
  });

  it('passes through unknown values unchanged', () => {
    expect(campusLabel('unknown-campus')).toBe('unknown-campus');
  });
});

describe('departmentLabel', () => {
  it('resolves slug to short name', () => {
    expect(departmentLabel('iaud')).toBe('IAUD');
  });

  it('resolves full name to short name', () => {
    expect(departmentLabel('Instituto de Arquitetura e Design')).toBe('IAUD');
  });

  it('passes through unknown slug unchanged', () => {
    expect(departmentLabel('unknown-dept')).toBe('unknown-dept');
  });
});
