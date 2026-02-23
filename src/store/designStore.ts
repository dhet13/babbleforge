import { create } from 'zustand';
import type { DesignDocument, DesignObject, DesignListItem } from '../types/design';
import { api } from '../services/apiClient';

const MAX_UNDO = 30;

interface DesignStore {
  // State
  currentDesign: DesignDocument | null;
  designs: DesignListItem[];
  selectedIds: string[];
  undoStack: DesignDocument[];
  redoStack: DesignDocument[];
  isSaving: boolean;
  viewMode: 'editor' | 'figma';

  // Design CRUD
  setDesign: (design: DesignDocument) => void;
  clearDesign: () => void;
  loadDesigns: (sheetId: string) => Promise<void>;
  saveDesign: (sheetId: string) => Promise<void>;
  loadDesign: (sheetId: string, designId: string) => Promise<void>;

  // Object manipulation
  addObject: (obj: DesignObject) => void;
  updateObject: (id: string, updates: Partial<DesignObject>) => void;
  removeObject: (id: string) => void;
  setObjects: (objects: DesignObject[]) => void;

  // Selection
  setSelectedIds: (ids: string[]) => void;
  clearSelection: () => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  pushUndo: () => void;

  // View
  setViewMode: (mode: 'editor' | 'figma') => void;
}

export const useDesignStore = create<DesignStore>((set, get) => ({
  currentDesign: null,
  designs: [],
  selectedIds: [],
  undoStack: [],
  redoStack: [],
  isSaving: false,
  viewMode: 'editor',

  setDesign: (design) =>
    set({ currentDesign: design, selectedIds: [], undoStack: [], redoStack: [] }),

  clearDesign: () =>
    set({ currentDesign: null, selectedIds: [], undoStack: [], redoStack: [] }),

  loadDesigns: async (sheetId) => {
    const list = await api.getDesigns(sheetId);
    set({ designs: list });
  },

  saveDesign: async (sheetId) => {
    const { currentDesign } = get();
    if (!currentDesign) return;

    set({ isSaving: true });
    try {
      const updated = {
        ...currentDesign,
        metadata: { ...currentDesign.metadata, updatedAt: new Date().toISOString() },
      };

      if (currentDesign.id && currentDesign.id !== '') {
        await api.updateDesign(sheetId, currentDesign.id, {
          name: updated.name,
          screenId: updated.screenId,
          data: updated,
        });
      } else {
        const created = await api.createDesign(sheetId, {
          name: updated.name,
          screenId: updated.screenId,
          data: updated,
        });
        set({ currentDesign: { ...updated, id: created.id } });
      }
    } finally {
      set({ isSaving: false });
    }
  },

  loadDesign: async (sheetId, designId) => {
    const design = await api.getDesign(sheetId, designId);
    // The server returns the full row; design data is in .data field
    const designData = (design as unknown as { data: DesignDocument }).data || design;
    set({ currentDesign: designData, selectedIds: [], undoStack: [], redoStack: [] });
  },

  // Object manipulation — all push undo first
  addObject: (obj) => {
    const { currentDesign } = get();
    if (!currentDesign) return;
    get().pushUndo();
    set({
      currentDesign: {
        ...currentDesign,
        objects: [...currentDesign.objects, obj],
      },
    });
  },

  updateObject: (id, updates) => {
    const { currentDesign } = get();
    if (!currentDesign) return;
    get().pushUndo();
    set({
      currentDesign: {
        ...currentDesign,
        objects: currentDesign.objects.map((obj) =>
          obj.id === id ? { ...obj, ...updates } as DesignObject : obj,
        ),
      },
    });
  },

  removeObject: (id) => {
    const { currentDesign } = get();
    if (!currentDesign) return;
    get().pushUndo();
    set({
      currentDesign: {
        ...currentDesign,
        objects: currentDesign.objects.filter((obj) => obj.id !== id),
      },
      selectedIds: get().selectedIds.filter((sid) => sid !== id),
    });
  },

  setObjects: (objects) => {
    const { currentDesign } = get();
    if (!currentDesign) return;
    set({ currentDesign: { ...currentDesign, objects } });
  },

  setSelectedIds: (ids) => set({ selectedIds: ids }),
  clearSelection: () => set({ selectedIds: [] }),

  pushUndo: () => {
    const { currentDesign, undoStack } = get();
    if (!currentDesign) return;
    const newStack = [...undoStack, structuredClone(currentDesign)].slice(-MAX_UNDO);
    set({ undoStack: newStack, redoStack: [] });
  },

  undo: () => {
    const { undoStack, currentDesign } = get();
    if (undoStack.length === 0 || !currentDesign) return;
    const previous = undoStack[undoStack.length - 1];
    set({
      currentDesign: previous,
      undoStack: undoStack.slice(0, -1),
      redoStack: [...get().redoStack, structuredClone(currentDesign)],
    });
  },

  redo: () => {
    const { redoStack, currentDesign } = get();
    if (redoStack.length === 0 || !currentDesign) return;
    const next = redoStack[redoStack.length - 1];
    set({
      currentDesign: next,
      redoStack: redoStack.slice(0, -1),
      undoStack: [...get().undoStack, structuredClone(currentDesign)],
    });
  },

  setViewMode: (mode) => set({ viewMode: mode }),
}));
