import type { TabName, SheetRow } from "./sheets.js";

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  provider: "google" | "github";
}

// ─── Projects ────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
}

// ─── Sheets ──────────────────────────────────────────────────────────────────

export interface Sheet {
  id: string;
  projectId: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface SheetDataResponse {
  sheetId: string;
  data: Record<TabName, SheetRow[]>;
}

// ─── Row CRUD ────────────────────────────────────────────────────────────────

export interface AddRowRequest {
  data: Record<string, string>;
}

export interface AddRowResponse {
  success: boolean;
  row: SheetRow;
}

export interface UpdateRowRequest {
  updates: Record<string, string>;
}

export interface DeleteRowResponse {
  success: boolean;
  deletedId: string;
}

// ─── MCP Tokens ──────────────────────────────────────────────────────────────

export interface McpToken {
  id: string;
  name: string;
  token: string;
  projectId: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface CreateTokenRequest {
  name: string;
  projectId: string;
}
