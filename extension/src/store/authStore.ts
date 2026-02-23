import { create } from 'zustand';

interface AuthState {
  token: string | null;
  serverUrl: string;
  sheetId: string | null;
  projectId: string | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;

  setToken: (token: string) => Promise<void>;
  setServerUrl: (url: string) => Promise<void>;
  loadSaved: () => Promise<void>;
  disconnect: () => Promise<void>;
  setConnected: (sheetId: string, projectId: string) => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  serverUrl: 'http://localhost:3100',
  sheetId: null,
  projectId: null,
  isConnected: false,
  isLoading: false,
  error: null,

  setToken: async (token: string) => {
    set({ token, isLoading: true, error: null });
    await chrome.storage.local.set({ sindri_token: token });
    set({ isLoading: false });
  },

  setServerUrl: async (url: string) => {
    set({ serverUrl: url });
    await chrome.storage.local.set({ sindri_server_url: url });
  },

  loadSaved: async () => {
    set({ isLoading: true });
    const data = await chrome.storage.local.get([
      'sindri_token',
      'sindri_server_url',
      'sindri_sheet_id',
      'sindri_project_id',
    ]);
    set({
      token: data.sindri_token || null,
      serverUrl: data.sindri_server_url || 'http://localhost:3100',
      sheetId: data.sindri_sheet_id || null,
      projectId: data.sindri_project_id || null,
      isConnected: !!(data.sindri_token && data.sindri_sheet_id),
      isLoading: false,
    });
  },

  disconnect: async () => {
    // Tell background to disconnect WS
    chrome.runtime.sendMessage({ type: 'disconnect_ws' });
    await chrome.storage.local.remove([
      'sindri_token',
      'sindri_sheet_id',
      'sindri_project_id',
    ]);
    set({
      token: null,
      sheetId: null,
      projectId: null,
      isConnected: false,
      error: null,
    });
  },

  setConnected: (sheetId: string, projectId: string) => {
    set({ sheetId, projectId, isConnected: true, error: null });
    chrome.storage.local.set({
      sindri_sheet_id: sheetId,
      sindri_project_id: projectId,
    });
    // Tell background to connect WS
    const { serverUrl, token } = get();
    chrome.runtime.sendMessage({
      type: 'connect_ws',
      serverUrl,
      token,
      sheetId,
    });
  },

  setError: (error: string | null) => set({ error }),
}));
