import { create } from 'zustand';
import type {
  MetaRow, GlobalRuleRow, DataModelRow, FeatureRow,
  DesignTokenRow, ScreenRow, ErrorRow, TabName, SheetRow,
} from '@shared/types/sheets.js';
import type { WsEvent } from '@shared/types/ws.js';
import { api } from '../services/apiClient.ts';
import { useAuthStore } from './authStore.ts';

interface SheetState {
  meta: MetaRow[];
  rules: GlobalRuleRow[];
  dataModel: DataModelRow[];
  features: FeatureRow[];
  design: DesignTokenRow[];
  screens: ScreenRow[];
  errors: ErrorRow[];
  activeTab: TabName;

  isLoading: boolean;
  error: string | null;

  setActiveTab: (tab: TabName) => void;
  loadSheet: () => Promise<void>;
  addRow: (tab: TabName, data: Record<string, string>) => Promise<SheetRow>;
  updateRow: (tab: TabName, id: string, updates: Record<string, string>) => Promise<void>;
  deleteRow: (tab: TabName, id: string) => Promise<void>;
  getTabData: (tab: TabName) => SheetRow[];
  getAllData: () => Record<TabName, SheetRow[]>;
  applyWsMessage: (msg: WsEvent) => void;
}

export const useSheetStore = create<SheetState>((set, get) => ({
  meta: [],
  rules: [],
  dataModel: [],
  features: [],
  design: [],
  screens: [],
  errors: [],
  activeTab: 'meta',

  isLoading: false,
  error: null,

  setActiveTab: (tab) => set({ activeTab: tab }),

  loadSheet: async () => {
    const sheetId = useAuthStore.getState().sheetId;
    if (!sheetId) return;

    set({ isLoading: true, error: null });
    try {
      const response = await api.getSheetData(sheetId);
      set({
        meta: response.data.meta as MetaRow[],
        rules: response.data.rules as GlobalRuleRow[],
        dataModel: response.data.dataModel as DataModelRow[],
        features: response.data.features as FeatureRow[],
        design: response.data.design as DesignTokenRow[],
        screens: response.data.screens as ScreenRow[],
        errors: response.data.errors as ErrorRow[],
        isLoading: false,
      });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  addRow: async (tab, data) => {
    const sheetId = useAuthStore.getState().sheetId;
    if (!sheetId) throw new Error('No sheet loaded');

    const result = await api.addRow(sheetId, tab, data);

    set((state) => ({
      [tab]: [...(state[tab] as SheetRow[]), result.row],
    }));

    return result.row;
  },

  updateRow: async (tab, id, updates) => {
    const sheetId = useAuthStore.getState().sheetId;
    if (!sheetId) throw new Error('No sheet loaded');

    // 낙관적 업데이트
    set((state) => ({
      [tab]: (state[tab] as SheetRow[]).map((r) =>
        r.id === id ? ({ ...r, ...updates } as SheetRow) : r,
      ),
    }));

    try {
      await api.updateRow(sheetId, tab, id, updates);
    } catch (e) {
      // 실패 시 서버에서 다시 로드
      const currentSheetId = useAuthStore.getState().sheetId;
      if (currentSheetId) {
        const response = await api.getSheetData(currentSheetId);
        set({ [tab]: response.data[tab] });
      }
      throw e;
    }
  },

  deleteRow: async (tab, id) => {
    const sheetId = useAuthStore.getState().sheetId;
    if (!sheetId) throw new Error('No sheet loaded');

    const backup = [...(get()[tab] as SheetRow[])];

    set((state) => ({
      [tab]: (state[tab] as SheetRow[]).filter((r) => r.id !== id),
    }));

    try {
      await api.deleteRow(sheetId, tab, id);
    } catch (e) {
      set({ [tab]: backup });
      throw e;
    }
  },

  getTabData: (tab) => get()[tab] as SheetRow[],

  getAllData: () => {
    const s = get();
    return {
      meta: s.meta,
      rules: s.rules,
      dataModel: s.dataModel,
      features: s.features,
      design: s.design,
      screens: s.screens,
      errors: s.errors,
    };
  },

  applyWsMessage: (msg: WsEvent) => {
    const state = get();

    switch (msg.type) {
      case 'row_added':
        if (msg.tab && msg.row) {
          const existing = (state[msg.tab] as SheetRow[]).find(
            (r) => r.id === msg.row.id,
          );
          if (!existing) {
            set({ [msg.tab]: [...(state[msg.tab] as SheetRow[]), msg.row] });
          }
        }
        break;

      case 'row_updated':
        if (msg.tab && msg.rowId && msg.updates) {
          set({
            [msg.tab]: (state[msg.tab] as SheetRow[]).map((r) =>
              r.id === msg.rowId ? ({ ...r, ...msg.updates } as SheetRow) : r,
            ),
          });
        }
        break;

      case 'row_deleted':
        if (msg.tab && msg.rowId) {
          set({
            [msg.tab]: (state[msg.tab] as SheetRow[]).filter(
              (r) => r.id !== msg.rowId,
            ),
          });
        }
        break;
    }
  },
}));
