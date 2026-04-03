import type { Space } from '@/types/space';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;
const IS_DEV_AUTH = import.meta.env.VITE_DEV_AUTH === 'true';

function getHeaders(token: string | null): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  // Dev auth middleware returns 401 if Authorization header is present — skip it in dev
  if (token && !IS_DEV_AUTH) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function request<T>(
  path: string,
  token: string | null,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...getHeaders(token), ...(options.headers || {}) },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, error.error || res.statusText, error.code, error.details);
  }

  return res.json();
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

// --- Endpoints ---

export const api = {
  // Auth (dev)
  devLogin: (role: string) =>
    fetch(`${BASE_URL.replace('/api/v1', '')}/dev/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    }).then((r) => r.json() as Promise<{ token: string }>),

  // Users
  getMe: (token: string | null) =>
    request<{ id: string; name: string; email: string; registration: string; role: string }>(
      '/users/me', token
    ),

  // Spaces
  listSpaces: (token: string | null, params?: { campus?: string; type?: string; modelId?: string }) =>
    request<{ data: Space[]; pagination: any }>(
      `/spaces?${new URLSearchParams(params as any)}`, token
    ),

  getSpace: (token: string | null, id: string) =>
    request<Space>(`/spaces/${id}`, token),

  getAvailability: (token: string, spaceId: string, date: string) =>
    request<any>(`/spaces/${spaceId}/availability?date=${date}`, token),

  // Reservations
  createReservation: (token: string, body: { spaceId: string; date: string; timeSlot: string }) =>
    request<any>('/reservations', token, { method: 'POST', body: JSON.stringify(body) }),

  getMyReservations: (token: string, page = 1, limit = 20) =>
    request<{ data: any[]; pagination: any }>(
      `/reservations/mine?page=${page}&limit=${limit}`, token
    ),

  cancelReservation: (token: string, id: string) =>
    request<any>(`/reservations/${id}/cancel`, token, { method: 'PATCH' }),

  // Notifications
  getNotifications: (token: string) =>
    request<{ data: any[] }>('/notifications', token),

  markNotificationRead: (token: string, id: string) =>
    request<any>(`/notifications/${id}/read`, token, { method: 'PATCH' }),

  markAllRead: (token: string) =>
    request<any>('/notifications/read-all', token, { method: 'PATCH' }),
};
