import type { TabName, SheetRow } from '../types/sheets';
import type {
  AuthUser,
  Project,
  Sheet,
  SheetDataResponse,
  AddRowResponse,
  McpToken,
} from '../types/api';

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
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
  // ─── Auth ────────────────────────────────────────────────────────
  getMe: () => request<AuthUser>('/auth/me'),

  // ─── Projects ────────────────────────────────────────────────────
  getProjects: () => request<Project[]>('/api/v1/projects'),

  createProject: (name: string, description?: string) =>
    request<Project & { defaultSheetId: string }>('/api/v1/projects', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    }),

  getProject: (pid: string) =>
    request<Project & { sheets: Sheet[] }>(`/api/v1/projects/${pid}`),

  deleteProject: (pid: string) =>
    request<{ success: boolean }>(`/api/v1/projects/${pid}`, {
      method: 'DELETE',
    }),

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

  // ─── MCP Tokens ──────────────────────────────────────────────────
  getTokens: () => request<McpToken[]>('/api/v1/mcp-tokens'),

  createToken: (name: string, projectId: string) =>
    request<McpToken>('/api/v1/mcp-tokens', {
      method: 'POST',
      body: JSON.stringify({ name, projectId }),
    }),

  deleteToken: (tokenId: string) =>
    request<{ success: boolean }>(`/api/v1/mcp-tokens/${tokenId}`, {
      method: 'DELETE',
    }),
};
