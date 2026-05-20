import type { Space } from '@/types/space';
import type { Availability, Reservation, Notification, Blocking } from '@/types/reservation';
import type { OccupancyReport, SpaceReportData } from '@/types/report';
import type { EquipmentReport } from '@/types/equipment-report';

const BASE_URL = '/api/v1';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  registration: string | null;
  role: string;
  isMasterAdmin: boolean;
  unreadCount?: number;
}

export interface InvitationPreview {
  valid: boolean;
  inviterName?: string;
  role?: string;
}

function getHeaders(token: string | null, method: string = 'GET'): HeadersInit {
  const headers: HeadersInit = {};
  if (method !== 'GET' && method !== 'HEAD') {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  token: string | null,
  options: RequestInit = {},
  meta: { authPath?: boolean; _retried?: boolean } = {}
): Promise<T> {
  const method = options.method || 'GET';
  const root = BASE_URL.replace('/api/v1', '');
  const url = meta.authPath ? `${root}${path}` : `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { ...getHeaders(token, method), ...(options.headers || {}) },
  });

  if (res.status === 401 && !meta._retried && !meta.authPath) {
    // Import inside function to avoid circular dep at module load time
    const { useAuthStore } = await import('@/stores/auth');
    const auth = useAuthStore();
    if (auth.refreshToken) {
      try {
        const { accessToken, refreshToken } = await api.refresh(auth.refreshToken);
        auth.setTokens(accessToken, refreshToken);
        return request<T>(path, accessToken, options, { ...meta, _retried: true });
      } catch {
        auth.logout();
        // Let the original 401 propagate so the route guard kicks in.
      }
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, error.error || res.statusText, error.code, error.details);
  }

  const text = await res.text();
  if (!text) return undefined as unknown as T;
  return JSON.parse(text) as T;
}

// --- Endpoints ---

export const api = {
  login: (body: { email: string; password: string }) =>
    request<{ accessToken: string; refreshToken: string; user: PublicUser }>(
      '/auth/login', null, { method: 'POST', body: JSON.stringify(body) },
      { authPath: true }
    ),

  refresh: (refreshToken: string) =>
    request<{ accessToken: string; refreshToken: string }>(
      '/auth/refresh', null, { method: 'POST', body: JSON.stringify({ refreshToken }) },
      { authPath: true }
    ),

  logout: (refreshToken: string) =>
    request<void>(
      '/auth/logout', null, { method: 'POST', body: JSON.stringify({ refreshToken }) },
      { authPath: true }
    ),

  previewInvitation: (token: string) =>
    request<InvitationPreview>(
      `/auth/invitations/${encodeURIComponent(token)}`, null, {},
      { authPath: true }
    ),

  acceptInvitation: (token: string, password: string) =>
    request<{ accessToken: string; refreshToken: string; user: PublicUser }>(
      `/auth/invitations/${encodeURIComponent(token)}/accept`,
      null,
      { method: 'POST', body: JSON.stringify({ password }) },
      { authPath: true }
    ),

  // Users
  getMe: (token: string | null) =>
    request<{ id: string; name: string; email: string; registration: string | null; role: string; department?: string; unreadCount: number; isMasterAdmin: boolean }>(
      '/users/me', token
    ),

  // Departments
  listDepartments: (token: string | null) =>
    request<Array<{ id: string; name: string; campus: string }>>('/departments', token),

  // Spaces — GET /spaces returns array directly (no data wrapper)
  listSpaces: (token: string | null, params?: { campus?: string; block?: string; department?: string; type?: string; limit?: string; page?: string }) =>
    request<Space[]>(`/spaces?${new URLSearchParams(params as any)}`, token),

  getSpace: (token: string | null, id: string) =>
    request<Space>(`/spaces/${id}`, token),

  getAvailability: (token: string | null, spaceId: string, date: string) =>
    request<Availability>(`/spaces/${spaceId}/availability?date=${date}`, token),

  // Reservations — GET /reservations/mine returns array directly
  createReservation: (
    token: string | null,
    body: { spaceId: string; date: string; startTime: string; endTime: string; purpose?: string; description?: string }
  ) => request<Reservation>('/reservations', token, { method: 'POST', body: JSON.stringify(body) }),

  createRecurringReservation: (
    token: string | null,
    body: {
      spaceId: string;
      startDate: string;
      endDate: string;
      dayOfWeek: number; // 0 = Sunday, 6 = Saturday
      startTime: string;
      endTime: string;
      description: string;
    }
  ) => request<{ recurrenceId: string; created: Reservation[]; skipped: string[] }>(
    '/reservations/recurring', token, { method: 'POST', body: JSON.stringify(body) }
  ),

  getMyReservations: (token: string | null, page = 1, limit = 20) =>
    request<Reservation[]>(`/reservations/mine?page=${page}&limit=${limit}`, token),

  cancelReservation: (token: string | null, id: string) =>
    request<Reservation>(`/reservations/${id}/cancel`, token, { method: 'PATCH' }),

  cancelReservationSeries: (token: string | null, recurrenceId: string) =>
    request<Reservation[]>(`/reservations/series/${recurrenceId}/cancel`, token, { method: 'PATCH' }),

  // Blockings — GET /blockings/mine returns array directly
  getMyBlockings: (token: string | null) =>
    request<Blocking[]>('/blockings/mine', token),

  // GET /blockings/space/:id returns array directly
  getBlockings: (token: string | null, spaceId: string, date?: string) =>
    request<Blocking[]>(
      `/blockings/space/${spaceId}${date ? `?date=${date}` : ''}`,
      token
    ),

  createBlocking: (
    token: string | null,
    body: { spaceId: string; date: string; startTime: string; endTime: string; blockType: string; reason?: string }
  ) => request<Blocking>('/blockings', token, { method: 'POST', body: JSON.stringify(body) }),

  removeBlocking: (token: string | null, id: string) =>
    request<Blocking>(`/blockings/${id}/remove`, token, { method: 'PATCH' }),

  // Notifications — GET /notifications returns array directly
  getNotifications: (token: string | null) =>
    request<Notification[]>('/notifications', token),

  markNotificationRead: (token: string | null, id: string) =>
    request<Notification>(`/notifications/${id}/read`, token, { method: 'PATCH' }),

  markAllRead: (token: string | null) =>
    request<{ updated: number }>('/notifications/read-all', token, { method: 'PATCH' }),

  // Reports
  getOccupancyReport: async (token: string | null, params?: { startDate?: string; endDate?: string; campus?: string; department?: string }): Promise<OccupancyReport> => {
    const raw = await request<any>(`/reports/occupancy?${new URLSearchParams(params as any)}`, token);

    const turnoLabel: Record<string, string> = { morning: 'Manhã', afternoon: 'Tarde', evening: 'Noite' };

    return {
      summary: {
        ocupacaoMedia: raw.summary.occupancyRate ?? 0,
        totalReservas: raw.summary.totalReservations ?? 0,
        salasUsadas: raw.summary.uniqueSpacesUsed ?? 0,
      },
      daily: (raw.dailySeries ?? []).map((d: any) => ({
        date: d.date,
        ocupacao: d.occupancyRate ?? 0,
        reservas: d.reservations ?? 0,
      })),
      turnos: (raw.byTurno ?? []).map((t: any) => ({
        turno: turnoLabel[t.turno] ?? t.turno,
        reservas: t.count ?? 0,
      })),
      spaces: (raw.tabela ?? []).map((s: any) => ({
        id: s.spaceId ?? s.id,
        nome: s.name ?? '',
        numero: s.number ?? '',
        bloco: s.block ?? '',
        tipo: s.type ?? '',
        capacidade: s.capacity ?? 0,
        reservas: s.reservations ?? 0,
        taxaOcupacao: s.occupancyRate ?? 0,
      })),
    };
  },

  // MEL-005: Individual space report
  getSpaceReport: (token: string | null, spaceId: string, params: { startDate: string; endDate: string }) =>
    request<SpaceReportData>(`/spaces/${spaceId}/report?${new URLSearchParams(params)}`, token),

  // Equipment Reports
  createEquipmentReport: (token: string | null, equipmentId: string, body: { description: string; severity: 'minor' | 'major' | 'blocking' }) =>
    request<EquipmentReport>(`/equipment/${equipmentId}/reports`, token, {
      method: 'POST', body: JSON.stringify(body),
    }),

  listEquipmentReports: (token: string | null, equipmentId: string) =>
    request<EquipmentReport[]>(`/equipment/${equipmentId}/reports`, token),

  listMyEquipmentReports: (token: string | null) =>
    request<EquipmentReport[]>('/equipment/reports/mine', token),

  listPendingEquipmentReports: (token: string | null, filters?: { spaceId?: string; status?: string }) =>
    request<EquipmentReport[]>(`/equipment/reports/pending?${new URLSearchParams(filters as any)}`, token),

  acknowledgeEquipmentReport: (token: string | null, id: string) =>
    request<EquipmentReport>(`/equipment/reports/${id}/acknowledge`, token, { method: 'PATCH' }),

  resolveEquipmentReport: (token: string | null, id: string) =>
    request<EquipmentReport>(`/equipment/reports/${id}/resolve`, token, { method: 'PATCH' }),

  dismissEquipmentReport: (token: string | null, id: string, reason: string) =>
    request<EquipmentReport>(`/equipment/reports/${id}/dismiss`, token, {
      method: 'PATCH', body: JSON.stringify({ reason }),
    }),
};
