import type { TabName, SheetRow } from '@shared/types/sheets.js';
import type {
  SheetDataResponse,
  AddRowResponse,
} from '@shared/types/api.js';
import { useAuthStore } from '../store/authStore.ts';

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function getBaseUrl(): string {
  return useAuthStore.getState().serverUrl;
}

function getToken(): string {
  const token = useAuthStore.getState().token;
  if (!token) throw new ApiError('No token configured', 401);
  return token;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error || 'API Error', res.status);
  }

  return res.json();
}

export const api = {
  // ─── Sheets ──────────────────────────────────────────────────────
  getSheetData: (sheetId: string) =>
    request<SheetDataResponse>(`/api/v1/sheets/${sheetId}`),

  getTabData: (sheetId: string, tab: TabName) =>
    request<SheetRow[]>(`/api/v1/sheets/${sheetId}/tabs/${tab}`),

  // ─── Rows ────────────────────────────────────────────────────────
  addRow: (sheetId: string, tab: TabName, data: Record<string, string>) =>
    request<AddRowResponse>(`/api/v1/sheets/${sheetId}/tabs/${tab}/rows`, {
      method: 'POST',
      body: JSON.stringify({ data }),
    }),

  updateRow: (
    sheetId: string,
    tab: TabName,
    rowId: string,
    updates: Record<string, string>,
  ) =>
    request<{ success: boolean }>(
      `/api/v1/sheets/${sheetId}/tabs/${tab}/rows/${rowId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ updates }),
      },
    ),

  deleteRow: (sheetId: string, tab: TabName, rowId: string) =>
    request<{ success: boolean; deletedId: string }>(
      `/api/v1/sheets/${sheetId}/tabs/${tab}/rows/${rowId}`,
      {
        method: 'DELETE',
      },
    ),

  // ─── Validate token (get project info) ──────────────────────────
  validateToken: () =>
    request<{ valid: boolean; projectId: string; sheetId: string }>(
      '/api/v1/mcp-tokens/validate',
    ),
};
