import { describe, expect, it } from 'vitest';
import { CAN_VIEW_UNIT_RESERVATIONS, hasRole } from '@/utils/roles';
import {
  DEFAULT_UNIT_RESERVATIONS_FILTERS,
  buildUnitFilterChips,
  buildUnitReservationsQuery,
  clearUnitFilter,
  countUnitActiveFilters,
  formatReservationPeriod,
  reservationActors,
  readRouteHighlight,
  resolveHighlightedReservationId,
  unitCreatorOptions,
  unitFiltersFromRouteQuery,
  unitPeriodChipLabel,
  unitSpaceOptions,
} from '@/utils/unit-reservations';

describe('CAN_VIEW_UNIT_RESERVATIONS', () => {
  it('allows only staff', () => {
    expect(hasRole('staff', CAN_VIEW_UNIT_RESERVATIONS)).toBe(true);
    for (const role of ['student', 'professor', 'maintenance'] as const) {
      expect(hasRole(role, CAN_VIEW_UNIT_RESERVATIONS)).toBe(false);
    }
    expect(hasRole(null, CAN_VIEW_UNIT_RESERVATIONS)).toBe(false);
  });
});

describe('unitSpaceOptions and unitCreatorOptions', () => {
  it('formats and sorts space options numerically in pt-BR', () => {
    const options = unitSpaceOptions([
      { id: 's2', name: 'Sala 10', number: 'B1-10' },
      { id: 's1', name: 'Sala 2', number: 'B1-02' },
      { id: 's3', name: 'LEAU', number: 'LEAU' },
      { id: 's4', name: '', number: '' },
    ]);
    expect(options).toEqual([
      { value: 's3', label: 'LEAU' },
      { value: 's4', label: 's4' },
      { value: 's1', label: 'Sala 2 (B1-02)' },
      { value: 's2', label: 'Sala 10 (B1-10)' },
    ]);
  });

  it('sorts creator options alphabetically in pt-BR', () => {
    const options = unitCreatorOptions([
      { id: 'u2', name: 'Carlos Oliveira' },
      { id: 'u1', name: 'Ana Paula' },
    ]);
    expect(options).toEqual([
      { value: 'u1', label: 'Ana Paula' },
      { value: 'u2', label: 'Carlos Oliveira' },
    ]);
  });
});

describe('filter helpers', () => {
  it('builds query params for the backend endpoint', () => {
    expect(
      buildUnitReservationsQuery(
        { spaceId: 'sp-1', from: '2026-06-01', until: '2026-06-30', status: 'active', createdBy: 'u-1' },
        2,
      ),
    ).toEqual({
      spaceId: 'sp-1',
      dateFrom: '2026-06-01',
      dateTo: '2026-06-30',
      status: 'active',
      createdBy: 'u-1',
      page: '2',
      limit: '20',
    });

    expect(buildUnitReservationsQuery({ ...DEFAULT_UNIT_RESERVATIONS_FILTERS }, 1)).toEqual({
      spaceId: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      status: 'active',
      createdBy: undefined,
      page: '1',
      limit: '20',
    });
  });

  it('counts active filters and formats period chips', () => {
    expect(countUnitActiveFilters({ ...DEFAULT_UNIT_RESERVATIONS_FILTERS })).toBe(0);
    expect(
      countUnitActiveFilters({
        spaceId: 'sp-1',
        from: '2026-06-01',
        until: '2026-06-10',
        status: 'canceled',
        createdBy: 'u-1',
      }),
    ).toBe(4);

    expect(unitPeriodChipLabel('2026-06-01', '2026-06-10')).toBe('01/06/2026 a 10/06/2026');
    expect(unitPeriodChipLabel('2026-06-01', null)).toBe('A partir de 01/06/2026');
    expect(unitPeriodChipLabel(null, '2026-06-10')).toBe('Até 10/06/2026');
  });

  it('builds and clears chips for all four filter dimensions', () => {
    const filters = {
      spaceId: 'sp-1',
      from: '2026-06-01',
      until: null,
      status: 'canceled' as const,
      createdBy: 'u-1',
    };
    const chips = buildUnitFilterChips(
      filters,
      [{ value: 'sp-1', label: 'Sala de Leitura (B1-01)' }],
      [{ value: 'u-1', label: 'Carlos Oliveira' }],
    );
    expect(chips).toEqual([
      { key: 'space', label: 'Sala de Leitura (B1-01)' },
      { key: 'period', label: 'A partir de 01/06/2026' },
      { key: 'status', label: 'Somente canceladas' },
      { key: 'createdBy', label: 'Registrada por: Carlos Oliveira' },
    ]);

    const fallbackChips = buildUnitFilterChips(
      { ...filters, status: 'all' },
      [],
      [],
    );
    expect(fallbackChips).toEqual([
      { key: 'space', label: 'Espaço' },
      { key: 'period', label: 'A partir de 01/06/2026' },
      { key: 'status', label: 'Inclusive canceladas' },
      { key: 'createdBy', label: 'Registrada por: Pessoa' },
    ]);

    clearUnitFilter(filters, 'space');
    expect(filters.spaceId).toBeNull();
    clearUnitFilter(filters, 'period');
    expect(filters.from).toBeNull();
    expect(filters.until).toBeNull();
    clearUnitFilter(filters, 'createdBy');
    expect(filters.createdBy).toBeNull();
    clearUnitFilter(filters, 'status');
    expect(filters.status).toBe('active');
  });
});

describe('reservationActors and formatReservationPeriod', () => {
  it('shows registeredBy and requester when made on behalf, and falls back to registeredBy when self-booked', () => {
    expect(
      reservationActors({
        registeredBy: { id: 'staff-1', name: 'Carlos Oliveira' },
        requester: { userId: 'prof-1', name: 'Dra. Maria Costa' },
      }),
    ).toEqual({
      registeredBy: 'Carlos Oliveira',
      requester: 'Dra. Maria Costa',
    });

    expect(
      reservationActors({
        registeredBy: { id: 'prof-1', name: 'Dra. Maria Costa' },
        requester: null,
      }),
    ).toEqual({
      registeredBy: 'Dra. Maria Costa',
      requester: 'Dra. Maria Costa',
    });

    expect(
      reservationActors({
        registeredBy: null,
        requester: null,
      }),
    ).toEqual({
      registeredBy: '—',
      requester: '—',
    });
  });

  it('formats named shifts and custom time ranges', () => {
    expect(formatReservationPeriod('07:00', '12:00')).toBe('07:00–12:00 (Manhã)');
    expect(formatReservationPeriod('09:00', '10:30')).toBe('09:00–10:30');
  });

  it('hydrates initial filters from route query', () => {
    expect(unitFiltersFromRouteQuery({})).toEqual({
      spaceId: null,
      from: null,
      until: null,
      status: 'active',
      createdBy: null,
    });
    expect(
      unitFiltersFromRouteQuery({
        spaceId: 'sp-1',
        from: '2026-06-10',
        until: '2026-06-10',
        status: 'all',
        createdBy: 'u-1',
      }),
    ).toEqual({
      spaceId: 'sp-1',
      from: '2026-06-10',
      until: '2026-06-10',
      status: 'all',
      createdBy: 'u-1',
    });

    expect(readRouteHighlight({ highlight: 'res-1' })).toBe('res-1');
    expect(readRouteHighlight({ highlight: '  ' })).toBeNull();
    expect(resolveHighlightedReservationId([{ id: 'res-1' }], 'res-1')).toBe('res-1');
    expect(resolveHighlightedReservationId([{ id: 'res-1' }], 'missing')).toBeNull();
    expect(resolveHighlightedReservationId([{ id: 'res-1' }], null)).toBeNull();
  });
});
