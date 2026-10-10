import { describe, expect, it } from 'vitest';
import { describeSeries } from '@/utils/my-reservations';
import type { Reservation } from '@/types/reservation';

function reservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: 'r1',
    spaceId: 's1',
    userId: 'u1',
    date: '2026-10-20',
    startTime: '09:00',
    endTime: '10:00',
    status: 'confirmed',
    changeOrigin: null,
    recurrenceId: null,
    purpose: null,
    description: null,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
    space: { id: 's1', number: '01', name: 'Sala 01' },
    ...overrides,
  };
}

describe('describeSeries', () => {
  it('returns the shared description when every occurrence has the same text', () => {
    const items = [
      reservation({ id: 'a', description: 'Aula de Projeto II' }),
      reservation({ id: 'b', description: 'Aula de Projeto II ' }),
    ];

    expect(describeSeries(items)).toEqual({ shared: 'Aula de Projeto II', varies: false });
  });

  it('flags per-occurrence descriptions when the texts differ', () => {
    const items = [
      reservation({ id: 'a', description: 'Banca de TCC — Ana' }),
      reservation({ id: 'b', description: 'Banca de TCC — Bruno' }),
    ];

    expect(describeSeries(items)).toEqual({ shared: null, varies: true });
  });

  it('treats a mix of filled and empty descriptions as varying', () => {
    const items = [
      reservation({ id: 'a', description: 'Reunião do colegiado' }),
      reservation({ id: 'b', description: null }),
    ];

    expect(describeSeries(items)).toEqual({ shared: null, varies: true });
  });

  it('returns nothing when no occurrence has a description', () => {
    const items = [
      reservation({ id: 'a', description: null }),
      reservation({ id: 'b', description: '   ' }),
      reservation({ id: 'c', description: undefined }),
    ];

    expect(describeSeries(items)).toEqual({ shared: null, varies: false });
  });
});
