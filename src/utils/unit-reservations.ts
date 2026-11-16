import { TIME_SLOT_LABELS, TIME_SLOT_RANGES, type Reservation, type TimeSlot } from '@/types/reservation';
import type {
  DepartmentReservationCreatorOption,
  DepartmentReservationSpaceOption,
  DepartmentReservationsQueryParams,
  UnitReservationsFilters,
} from '@/types/unit-reservations';
import { formatDateShort } from '@/utils/date';
import type { ReservationStatusFilter } from '@/utils/my-reservations';

export const UNIT_RESERVATIONS_PAGE_SIZE = 20;

export const DEFAULT_UNIT_RESERVATIONS_FILTERS: Readonly<UnitReservationsFilters> = Object.freeze({
  spaceId: null,
  from: null,
  until: null,
  status: 'active',
  createdBy: null,
});

export const UNIT_STATUS_FILTER_OPTIONS: { value: ReservationStatusFilter; label: string }[] = [
  { value: 'active', label: 'Todas, exceto canceladas' },
  { value: 'canceled', label: 'Somente canceladas' },
  { value: 'all', label: 'Todas, inclusive canceladas' },
];

const STATUS_FILTER_CHIP: Record<ReservationStatusFilter, string> = {
  active: '',
  canceled: 'Somente canceladas',
  all: 'Inclusive canceladas',
};

export type UnitFilterKey = 'space' | 'period' | 'status' | 'createdBy';

export interface SelectOption {
  value: string;
  label: string;
}

export function unitSpaceOptions(spaces: DepartmentReservationSpaceOption[]): SelectOption[] {
  return spaces
    .map((s) => ({
      value: s.id,
      label: s.name && s.number && s.name !== s.number ? `${s.name} (${s.number})` : s.name || s.number || s.id,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR', { numeric: true }));
}

export function unitCreatorOptions(creators: DepartmentReservationCreatorOption[]): SelectOption[] {
  return [...creators]
    .map((c) => ({ value: c.id, label: c.name }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
}

export function buildUnitReservationsQuery(
  filters: UnitReservationsFilters,
  page: number,
  limit = UNIT_RESERVATIONS_PAGE_SIZE,
): DepartmentReservationsQueryParams {
  return {
    spaceId: filters.spaceId ?? undefined,
    dateFrom: filters.from ?? undefined,
    dateTo: filters.until ?? undefined,
    status: filters.status,
    createdBy: filters.createdBy ?? undefined,
    page: String(page),
    limit: String(limit),
  };
}

export function countUnitActiveFilters(filters: UnitReservationsFilters): number {
  return [
    filters.spaceId,
    filters.from || filters.until,
    filters.status !== DEFAULT_UNIT_RESERVATIONS_FILTERS.status,
    filters.createdBy,
  ].filter(Boolean).length;
}

export function unitPeriodChipLabel(from: string | null, until: string | null): string {
  const fromLabel = from ? formatDateShort(from) : null;
  const untilLabel = until ? formatDateShort(until) : null;
  if (fromLabel && untilLabel) return `${fromLabel} a ${untilLabel}`;
  return fromLabel ? `A partir de ${fromLabel}` : `Até ${untilLabel}`;
}

export function buildUnitFilterChips(
  filters: UnitReservationsFilters,
  spaceOptions: SelectOption[],
  creatorOptions: SelectOption[],
): { key: UnitFilterKey; label: string }[] {
  const chips: { key: UnitFilterKey; label: string }[] = [];
  if (filters.spaceId) {
    const space = spaceOptions.find((s) => s.value === filters.spaceId);
    chips.push({ key: 'space', label: space?.label ?? 'Espaço' });
  }
  if (filters.from || filters.until) {
    chips.push({ key: 'period', label: unitPeriodChipLabel(filters.from, filters.until) });
  }
  if (filters.status !== DEFAULT_UNIT_RESERVATIONS_FILTERS.status) {
    chips.push({ key: 'status', label: STATUS_FILTER_CHIP[filters.status] });
  }
  if (filters.createdBy) {
    const creator = creatorOptions.find((c) => c.value === filters.createdBy);
    chips.push({ key: 'createdBy', label: `Registrada por: ${creator?.label ?? 'Pessoa'}` });
  }
  return chips;
}

export function clearUnitFilter(filters: UnitReservationsFilters, key: UnitFilterKey): void {
  if (key === 'space') filters.spaceId = null;
  else if (key === 'period') {
    filters.from = null;
    filters.until = null;
  } else if (key === 'createdBy') {
    filters.createdBy = null;
  } else {
    filters.status = DEFAULT_UNIT_RESERVATIONS_FILTERS.status;
  }
}

export function reservationActors(r: Pick<Reservation, 'registeredBy' | 'requester'>): {
  registeredBy: string;
  requester: string;
} {
  const registeredBy = r.registeredBy?.name?.trim() || '—';
  const requester = r.requester?.name?.trim() || registeredBy;
  return { registeredBy, requester };
}

export function formatReservationPeriod(startTime: string, endTime: string): string {
  const namedSlot = (Object.entries(TIME_SLOT_RANGES) as [TimeSlot, { startTime: string; endTime: string }][])
    .find(([, range]) => range.startTime === startTime && range.endTime === endTime);
  const range = `${startTime}–${endTime}`;
  return namedSlot ? `${range} (${TIME_SLOT_LABELS[namedSlot[0]]})` : range;
}
