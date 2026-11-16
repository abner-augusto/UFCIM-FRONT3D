import { describe, it, expect, vi } from 'vitest';
import * as apiModule from '@/services/api';
import { buildAuditLogPath, fetchActionHistory } from '@/services/action-history';
import {
  DEFAULT_ACTION_HISTORY_FILTERS,
  actionActorOptions,
  actionTypeMeta,
  buildActionHistoryFilterChips,
  buildActionHistoryQuery,
  clearActionHistoryFilter,
  countActionHistoryActiveFilters,
  formatActionSpace,
  formatActionTargetSchedule,
  reservationLinkForAction,
} from '@/utils/action-history';

describe('action-history utilities', () => {
  it('maps known and unknown action types to labels and variants', () => {
    expect(actionTypeMeta('create_reservation')).toEqual({ label: 'Reserva criada', variant: 'success' });
    expect(actionTypeMeta('cancel_reservation')).toEqual({ label: 'Reserva cancelada', variant: 'danger' });
    expect(actionTypeMeta('create_blocking')).toEqual({ label: 'Bloqueio criado', variant: 'warning' });
    expect(actionTypeMeta('custom_action')).toEqual({ label: 'custom_action', variant: 'muted' });
  });

  it('sorts actor options alphabetically in pt-BR', () => {
    const sorted = actionActorOptions([
      { id: 'u2', name: 'Carlos Oliveira' },
      { id: 'u1', name: 'Ana Paula' },
    ]);
    expect(sorted).toEqual([
      { value: 'u1', label: 'Ana Paula' },
      { value: 'u2', label: 'Carlos Oliveira' },
    ]);
  });

  it('builds query parameters, counts active filters, builds chips, and clears individual filters', () => {
    const filters = {
      ...DEFAULT_ACTION_HISTORY_FILTERS,
      userId: 'u2',
      actionType: 'create_reservation',
      from: '2026-05-01',
      until: '2026-05-15',
    };

    expect(countActionHistoryActiveFilters(DEFAULT_ACTION_HISTORY_FILTERS)).toBe(0);
    expect(countActionHistoryActiveFilters(filters)).toBe(3);

    expect(buildActionHistoryQuery(filters, 2, 15)).toEqual({
      userId: 'u2',
      actionType: 'create_reservation',
      dateFrom: '2026-05-01',
      dateTo: '2026-05-15',
      page: '2',
      limit: '15',
    });

    const chips = buildActionHistoryFilterChips(filters, [{ value: 'u2', label: 'Carlos Oliveira' }]);
    expect(chips.map((c) => c.key)).toEqual(['actor', 'actionType', 'period']);
    expect(chips[0].label).toBe('Pessoa: Carlos Oliveira');
    expect(chips[1].label).toBe('Ação: Reserva criada');

    clearActionHistoryFilter(filters, 'actor');
    expect(filters.userId).toBeNull();
    clearActionHistoryFilter(filters, 'actionType');
    expect(filters.actionType).toBeNull();
    clearActionHistoryFilter(filters, 'period');
    expect(filters.from).toBeNull();
    expect(filters.until).toBeNull();
  });

  it('formats space label and target schedule for single, series, and missing references', () => {
    expect(formatActionSpace({ id: 's1', name: 'Sala de Leitura', number: 'B1-01' })).toBe('Sala de Leitura (B1-01)');
    expect(formatActionSpace({ id: 's2', name: 'B1-02', number: 'B1-02' })).toBe('B1-02');
    expect(formatActionSpace(null)).toBe('—');

    expect(
      formatActionTargetSchedule({
        targetDate: '2026-06-10',
        targetEndDate: null,
        startTime: '08:00',
        endTime: '10:00',
      }),
    ).toBe('10/06/2026 · 08:00–10:00');

    expect(
      formatActionTargetSchedule({
        targetDate: '2026-06-15',
        targetEndDate: '2026-06-22',
        startTime: '14:00',
        endTime: '16:00',
      }),
    ).toBe('15/06/2026 a 22/06/2026 · 14:00–16:00');

    expect(
      formatActionTargetSchedule({
        targetDate: null,
        targetEndDate: null,
        startTime: null,
        endTime: null,
      }),
    ).toBeNull();
  });

  it('builds a unit-reservations deep link only when reservationId exists', () => {
    expect(
      reservationLinkForAction({
        reservationId: 'res-1',
        space: { id: 'sp-1', name: 'LEAU', number: 'B1-02' },
        targetDate: '2026-06-10',
      }),
    ).toEqual({
      name: 'unit-reservations',
      query: {
        highlight: 'res-1',
        spaceId: 'sp-1',
        from: '2026-06-10',
        until: '2026-06-10',
        status: 'all',
      },
    });

    expect(
      reservationLinkForAction({
        reservationId: null,
        space: { id: 'sp-1', name: 'LEAU', number: 'B1-02' },
        targetDate: '2026-06-10',
      }),
    ).toBeNull();
  });

  it('builds /logs path and delegates fetchActionHistory through api.request', async () => {
    expect(buildAuditLogPath()).toBe('/logs');
    expect(buildAuditLogPath({ userId: 'u1', actionType: undefined, page: '1' })).toBe('/logs?userId=u1&page=1');

    const spy = vi.spyOn(apiModule, 'request').mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
      actors: [],
    });
    await fetchActionHistory('tok-1', { userId: 'u1' });
    expect(spy).toHaveBeenCalledWith('/logs?userId=u1', 'tok-1');
    spy.mockRestore();
  });
});
