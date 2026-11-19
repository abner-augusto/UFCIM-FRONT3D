export interface ActionHistorySpaceSummary {
  id: string;
  name: string;
  number: string;
}

export interface ActionHistoryActorOption {
  id: string;
  name: string;
}

export interface ActionHistoryItem {
  id: string;
  userId: string;
  actor: { id: string; name: string } | null;
  actionType: string;
  referenceId: string | null;
  referenceType: 'reservation' | 'blocking';
  timestamp: string;
  details: string | null;
  space: ActionHistorySpaceSummary | null;
  targetDate: string | null;
  targetEndDate: string | null;
  startTime: string | null;
  endTime: string | null;
  reservationId: string | null;
  recurrenceId: string | null;
}

export interface ActionHistoryPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ActionHistoryResponse {
  data: ActionHistoryItem[];
  pagination: ActionHistoryPagination;
  actors: ActionHistoryActorOption[];
}

export type ActionHistoryQueryParams = Record<string, string | undefined> & {
  userId?: string;
  actionType?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
  limit?: string;
};

export interface ActionHistoryFilters {
  userId: string | null;
  actionType: string | null;
  from: string | null;
  until: string | null;
}
