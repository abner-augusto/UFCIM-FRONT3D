import type { Reservation } from './reservation';
import type { ReservationStatusFilter } from '@/utils/my-reservations';

export interface DepartmentReservationSpaceOption {
  id: string;
  name: string;
  number: string;
}

export interface DepartmentReservationCreatorOption {
  id: string;
  name: string;
}

export interface DepartmentReservationsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DepartmentReservationsResponse {
  data: Reservation[];
  pagination: DepartmentReservationsPagination;
  spaces: DepartmentReservationSpaceOption[];
  creators: DepartmentReservationCreatorOption[];
}

export type DepartmentReservationsQueryParams = Record<string, string | undefined> & {
  spaceId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: ReservationStatusFilter;
  createdBy?: string;
  page?: string;
  limit?: string;
};

export interface UnitReservationsFilters {
  spaceId: string | null;
  from: string | null;
  until: string | null;
  status: ReservationStatusFilter;
  createdBy: string | null;
}
