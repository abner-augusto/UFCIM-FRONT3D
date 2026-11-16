import type { RouteLocationRaw } from 'vue-router';
import type { StatusBadgeVariant } from '@/components/StatusBadge.vue';
import type {
  ActionHistoryActorOption,
  ActionHistoryFilters,
  ActionHistoryItem,
  ActionHistoryQueryParams,
  ActionHistorySpaceSummary,
} from '@/types/action-history';
import { formatDateShort } from '@/utils/date';
import { unitPeriodChipLabel, type SelectOption } from '@/utils/unit-reservations';

export const ACTION_HISTORY_PAGE_SIZE = 20;

export const DEFAULT_ACTION_HISTORY_FILTERS: Readonly<ActionHistoryFilters> = Object.freeze({
  userId: null,
  actionType: null,
  from: null,
  until: null,
});

export interface ActionMeta {
  label: string;
  variant: StatusBadgeVariant;
}

export const ACTION_TYPE_META: Record<string, ActionMeta> = {
  create_reservation: { label: 'Reserva criada', variant: 'success' },
  create_recurring_reservation: { label: 'Série de reservas criada', variant: 'success' },
  update_reservation: { label: 'Reserva editada', variant: 'warning' },
  cancel_reservation: { label: 'Reserva cancelada', variant: 'danger' },
  cancel_recurring_reservation: { label: 'Série cancelada', variant: 'danger' },
  override_reservation: { label: 'Reserva sobrescrita', variant: 'violet' },
  create_blocking: { label: 'Bloqueio criado', variant: 'warning' },
  remove_blocking: { label: 'Bloqueio removido', variant: 'muted' },
};

export const ACTION_TYPE_FILTER_OPTIONS: SelectOption[] = Object.entries(ACTION_TYPE_META).map(
  ([value, meta]) => ({ value, label: meta.label }),
);

export type ActionHistoryFilterKey = 'actor' | 'actionType' | 'period';

export function actionTypeMeta(actionType: string): ActionMeta {
  return ACTION_TYPE_META[actionType] ?? { label: actionType, variant: 'muted' };
}

export function actionActorOptions(actors: ActionHistoryActorOption[]): SelectOption[] {
  return [...actors]
    .map((a) => ({ value: a.id, label: a.name }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
}

export function buildActionHistoryQuery(
  filters: ActionHistoryFilters,
  page: number,
  limit = ACTION_HISTORY_PAGE_SIZE,
): ActionHistoryQueryParams {
  return {
    userId: filters.userId ?? undefined,
    actionType: filters.actionType ?? undefined,
    dateFrom: filters.from ?? undefined,
    dateTo: filters.until ?? undefined,
    page: String(page),
    limit: String(limit),
  };
}

export function countActionHistoryActiveFilters(filters: ActionHistoryFilters): number {
  return [filters.userId, filters.actionType, filters.from || filters.until].filter(Boolean).length;
}

export function buildActionHistoryFilterChips(
  filters: ActionHistoryFilters,
  actorOptions: SelectOption[],
): { key: ActionHistoryFilterKey; label: string }[] {
  const chips: { key: ActionHistoryFilterKey; label: string }[] = [];
  if (filters.userId) {
    const actor = actorOptions.find((a) => a.value === filters.userId);
    chips.push({ key: 'actor', label: `Pessoa: ${actor?.label ?? 'Usuário'}` });
  }
  if (filters.actionType) {
    chips.push({ key: 'actionType', label: `Ação: ${actionTypeMeta(filters.actionType).label}` });
  }
  if (filters.from || filters.until) {
    chips.push({ key: 'period', label: unitPeriodChipLabel(filters.from, filters.until) });
  }
  return chips;
}

export function clearActionHistoryFilter(filters: ActionHistoryFilters, key: ActionHistoryFilterKey): void {
  if (key === 'actor') filters.userId = null;
  else if (key === 'actionType') filters.actionType = null;
  else {
    filters.from = null;
    filters.until = null;
  }
}

export function formatActionSpace(space: ActionHistorySpaceSummary | null): string {
  if (!space) return '—';
  if (space.name && space.number && space.name !== space.number) {
    return `${space.name} (${space.number})`;
  }
  return space.name || space.number || space.id;
}

export function formatActionTargetSchedule(
  item: Pick<ActionHistoryItem, 'targetDate' | 'targetEndDate' | 'startTime' | 'endTime'>,
): string | null {
  if (!item.targetDate) return null;
  const datePart = item.targetEndDate && item.targetEndDate !== item.targetDate
    ? `${formatDateShort(item.targetDate)} a ${formatDateShort(item.targetEndDate)}`
    : formatDateShort(item.targetDate);
  const timePart = item.startTime && item.endTime ? `${item.startTime}–${item.endTime}` : null;
  return timePart ? `${datePart} · ${timePart}` : datePart;
}

export function reservationLinkForAction(
  item: Pick<ActionHistoryItem, 'reservationId' | 'space' | 'targetDate'>,
): RouteLocationRaw | null {
  if (!item.reservationId) return null;
  return {
    name: 'unit-reservations',
    query: {
      highlight: item.reservationId,
      ...(item.space?.id ? { spaceId: item.space.id } : {}),
      ...(item.targetDate ? { from: item.targetDate, until: item.targetDate } : {}),
      status: 'all',
    },
  };
}
