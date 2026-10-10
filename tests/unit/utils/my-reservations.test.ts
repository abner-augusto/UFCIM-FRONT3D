import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MY_RESERVATIONS_FILTERS,
  countActiveFilters,
  describeSeries,
  markCanceled,
  organizeMyReservations,
  reservationSpaceOptions,
  type MyReservationsFilters,
} from '@/utils/my-reservations';
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

// "Now" is mid-day on Thursday 15/10/2026, local time.
const NOW = new Date('2026-10-15T12:00:00');

const SALA = { id: 's1', number: '01', name: 'Sala 01' };
const AUDITORIO = { id: 's2', number: 'AUD', name: 'Auditório' };

function filters(overrides: Partial<MyReservationsFilters> = {}): MyReservationsFilters {
  return { ...DEFAULT_MY_RESERVATIONS_FILTERS, ...overrides };
}

const ids = (groups: { id: string }[]) => groups.map(g => g.id);

describe('organizeMyReservations — ordering and sections', () => {
  const list = [
    reservation({ id: 'past-old', date: '2026-09-01' }),
    reservation({ id: 'far', date: '2026-12-01' }),
    reservation({ id: 'past-recent', date: '2026-10-14' }),
    reservation({ id: 'soon', date: '2026-10-16' }),
    reservation({ id: 'later-today', date: '2026-10-15', startTime: '14:00', endTime: '15:00' }),
    reservation({ id: 'earlier-today', date: '2026-10-15', startTime: '08:00', endTime: '09:00' }),
  ];

  it('lists upcoming reservations soonest first', () => {
    const { upcoming } = organizeMyReservations(list, filters(), NOW);
    expect(ids(upcoming)).toEqual(['later-today', 'soon', 'far']);
  });

  it('keeps finished reservations apart, most recent first', () => {
    const { past } = organizeMyReservations(list, filters(), NOW);
    expect(ids(past)).toEqual(['earlier-today', 'past-recent', 'past-old']);
  });

  it('breaks same-day ties by start time', () => {
    const sameDay = [
      reservation({ id: 'b', date: '2026-10-20', startTime: '13:00', endTime: '14:00' }),
      reservation({ id: 'a', date: '2026-10-20', startTime: '07:00', endTime: '08:00' }),
    ];
    expect(ids(organizeMyReservations(sameDay, filters(), NOW).upcoming)).toEqual(['a', 'b']);
  });

  it('treats an occurrence ending at 24:00 as still upcoming during that day', () => {
    const late = [reservation({ id: 'late', date: '2026-10-15', startTime: '23:00', endTime: '24:00' })];
    expect(ids(organizeMyReservations(late, filters(), NOW).upcoming)).toEqual(['late']);
  });
});

describe('organizeMyReservations — filters', () => {
  it('filters by space', () => {
    const list = [
      reservation({ id: 'sala', spaceId: 's1', space: SALA }),
      reservation({ id: 'aud', spaceId: 's2', space: AUDITORIO }),
    ];
    const { upcoming } = organizeMyReservations(list, filters({ spaceId: 's2' }), NOW);
    expect(ids(upcoming)).toEqual(['aud']);
  });

  it('filters by an inclusive "until" date', () => {
    const list = [
      reservation({ id: 'in', date: '2026-12-18' }),
      reservation({ id: 'out', date: '2026-12-19' }),
    ];
    const { upcoming } = organizeMyReservations(list, filters({ until: '2026-12-18' }), NOW);
    expect(ids(upcoming)).toEqual(['in']);
  });

  it('filters by an inclusive "from" date', () => {
    const list = [
      reservation({ id: 'before', date: '2026-10-19' }),
      reservation({ id: 'on', date: '2026-10-20' }),
    ];
    const { upcoming } = organizeMyReservations(list, filters({ from: '2026-10-20' }), NOW);
    expect(ids(upcoming)).toEqual(['on']);
  });

  it('hides cancelled reservations by default', () => {
    const list = [
      reservation({ id: 'ok', date: '2026-10-20' }),
      reservation({ id: 'gone', date: '2026-10-21', status: 'canceled' }),
      reservation({ id: 'blocked', date: '2026-10-22', status: 'overridden' }),
    ];
    const { upcoming, past } = organizeMyReservations(list, filters(), NOW);
    expect(ids(upcoming)).toEqual(['ok', 'blocked']);
    expect(past).toEqual([]);
  });

  it('shows only cancelled reservations when asked', () => {
    const list = [
      reservation({ id: 'ok', date: '2026-10-20' }),
      reservation({ id: 'gone', date: '2026-10-21', status: 'canceled' }),
    ];
    const { upcoming } = organizeMyReservations(list, filters({ status: 'canceled' }), NOW);
    expect(ids(upcoming)).toEqual(['gone']);
  });

  it('shows every status when asked', () => {
    const list = [
      reservation({ id: 'ok', date: '2026-10-20' }),
      reservation({ id: 'gone', date: '2026-10-21', status: 'canceled' }),
    ];
    const { upcoming } = organizeMyReservations(list, filters({ status: 'all' }), NOW);
    expect(ids(upcoming)).toEqual(['ok', 'gone']);
  });
});

describe('organizeMyReservations — recurring series', () => {
  const series = (id: string, date: string, overrides: Partial<Reservation> = {}) =>
    reservation({ id, date, recurrenceId: 'rec-1', ...overrides });

  it('groups occurrences of a series into one entry, in date order', () => {
    const list = [
      series('o3', '2026-10-29'),
      reservation({ id: 'single', date: '2026-10-18' }),
      series('o1', '2026-10-08'),
      series('o2', '2026-10-22'),
    ];
    const { upcoming, past } = organizeMyReservations(list, filters(), NOW);

    expect(ids(upcoming)).toEqual(['single', 'rec-1']);
    const group = upcoming[1];
    expect(group.isRecurrent).toBe(true);
    expect(group.recurrenceId).toBe('rec-1');
    expect(ids(group.items)).toEqual(['o1', 'o2', 'o3']);
    expect(group.main.id).toBe('o2');
    expect(past).toEqual([]);
  });

  it('orders a series by its next occurrence', () => {
    const list = [
      series('o1', '2026-10-08'),
      series('o2', '2026-10-27'),
      reservation({ id: 'single', date: '2026-10-20' }),
    ];
    expect(ids(organizeMyReservations(list, filters(), NOW).upcoming)).toEqual(['single', 'rec-1']);
  });

  it('moves a fully finished series to the past section', () => {
    const list = [series('o1', '2026-09-01'), series('o2', '2026-09-08')];
    const { upcoming, past } = organizeMyReservations(list, filters(), NOW);
    expect(upcoming).toEqual([]);
    expect(ids(past)).toEqual(['rec-1']);
    expect(past[0].main.id).toBe('o2');
  });

  it('drops cancelled occurrences from a series by default', () => {
    const list = [
      series('o1', '2026-10-20', { status: 'canceled' }),
      series('o2', '2026-10-27'),
    ];
    const [group] = organizeMyReservations(list, filters(), NOW).upcoming;
    expect(ids(group.items)).toEqual(['o2']);
  });

  it('hides a series whose occurrences are all cancelled', () => {
    const list = [
      series('o1', '2026-10-20', { status: 'canceled' }),
      series('o2', '2026-10-27', { status: 'canceled' }),
    ];
    const { upcoming, past } = organizeMyReservations(list, filters(), NOW);
    expect(upcoming).toEqual([]);
    expect(past).toEqual([]);
  });

  it('applies the period filter per occurrence', () => {
    const list = [
      series('o1', '2026-10-20'),
      series('o2', '2026-12-15'),
      series('o3', '2027-01-12'),
    ];
    const [group] = organizeMyReservations(list, filters({ until: '2026-12-18' }), NOW).upcoming;
    expect(ids(group.items)).toEqual(['o1', 'o2']);
  });
});

describe('reservationSpaceOptions', () => {
  it('lists each booked space once, sorted by name', () => {
    const list = [
      reservation({ id: 'a', spaceId: 's1', space: SALA }),
      reservation({ id: 'b', spaceId: 's2', space: AUDITORIO }),
      reservation({ id: 'c', spaceId: 's1', space: SALA }),
    ];
    expect(reservationSpaceOptions(list)).toEqual([
      { value: 's2', label: 'Auditório' },
      { value: 's1', label: 'Sala 01' },
    ]);
  });

  it('falls back to the space number, then the id', () => {
    const list = [
      reservation({ id: 'a', spaceId: 's3', space: { id: 's3', number: '105', name: '' } }),
      reservation({ id: 'b', spaceId: 's4', space: undefined }),
    ];
    expect(reservationSpaceOptions(list)).toEqual([
      { value: 's3', label: '105' },
      { value: 's4', label: 's4' },
    ]);
  });
});

describe('countActiveFilters', () => {
  it('counts nothing for the defaults', () => {
    expect(countActiveFilters(DEFAULT_MY_RESERVATIONS_FILTERS)).toBe(0);
  });

  it('counts space, period and a non-default status', () => {
    expect(countActiveFilters(filters({ spaceId: 's1', until: '2026-12-18', status: 'canceled' }))).toBe(3);
    expect(countActiveFilters(filters({ from: '2026-10-01', until: '2026-12-18' }))).toBe(1);
  });
});

describe('markCanceled', () => {
  it('marks the given reservations as cancelled without touching the rest', () => {
    const list = [reservation({ id: 'a' }), reservation({ id: 'b' })];
    const result = markCanceled(list, ['a']);
    expect(result.map(r => r.status)).toEqual(['canceled', 'confirmed']);
    expect(list[0].status).toBe('confirmed');
  });

  it('makes a cancelled reservation leave the default list', () => {
    const list = [reservation({ id: 'a', date: '2026-10-20' }), reservation({ id: 'b', date: '2026-10-21' })];
    const { upcoming } = organizeMyReservations(markCanceled(list, ['a']), filters(), NOW);
    expect(ids(upcoming)).toEqual(['b']);
  });
});
