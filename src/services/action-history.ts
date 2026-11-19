import { request } from '@/services/api';
import type { ActionHistoryQueryParams, ActionHistoryResponse } from '@/types/action-history';

export function buildAuditLogPath(params?: ActionHistoryQueryParams): string {
  if (!params) return '/logs';
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') sp.append(key, value);
  }
  const query = sp.toString();
  return query ? `/logs?${query}` : '/logs';
}

export function fetchActionHistory(token: string | null, params?: ActionHistoryQueryParams) {
  return request<ActionHistoryResponse>(buildAuditLogPath(params), token);
}
