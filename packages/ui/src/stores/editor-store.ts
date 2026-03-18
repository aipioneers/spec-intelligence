import { create } from 'zustand';
import type { Specification, Plan } from '../types';
import type { BackendAdapter } from '../lib/backend-adapter';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EditorMode = 'form' | 'markdown' | 'raw';

export type ArtifactType = 'spec' | 'plan';

export interface DocumentState {
  slug: string;
  artifact: ArtifactType;
  content: string; // raw markdown content
  parsed: Specification | Plan | null; // parsed structured data
}

export interface EditorStoreState {
  // Document state
  currentDocument: DocumentState | null;
  mode: EditorMode;
  isDirty: boolean;
  lastSavedAt: Date | null;
  etag: string | null;

  // Loading / error
  loading: boolean;
  saving: boolean;
  error: string | null;

  // Actions
  loadDocument: (adapter: BackendAdapter, slug: string, artifact: ArtifactType) => Promise<void>;
  saveDocument: (adapter: BackendAdapter) => Promise<void>;
  switchMode: (mode: EditorMode) => void;
  updateContent: (content: string) => void;
  updateParsed: (parsed: Specification | Plan) => void;
  markClean: () => void;
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useEditorStore = create<EditorStoreState>((set, get) => ({
  // --- Initial state ---
  currentDocument: null,
  mode: 'form',
  isDirty: false,
  lastSavedAt: null,
  etag: null,
  loading: false,
  saving: false,
  error: null,

  // --- Actions ---

  loadDocument: async (adapter, slug, artifact) => {
    set({ loading: true, error: null });
    try {
      let content = '';
      let parsed: Specification | Plan | null = null;

      if (artifact === 'spec') {
        const spec = await adapter.getSpec(slug);
        parsed = spec;
        // We don't have the raw markdown from getSpec alone; store parsed data
        // The raw content can be fetched separately if needed for raw mode
      } else {
        const plan = await adapter.getPlan(slug);
        parsed = plan;
      }

      set({
        currentDocument: { slug, artifact, content, parsed },
        isDirty: false,
        loading: false,
        error: null,
        mode: 'form',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load document';
      set({ error: message, loading: false });
    }
  },

  saveDocument: async (adapter) => {
    const { currentDocument, etag } = get();
    if (!currentDocument) return;

    set({ saving: true, error: null });
    try {
      const { slug, artifact, content, parsed } = currentDocument;

      if (artifact === 'spec') {
        if (content) {
          // Raw markdown save
          const spec = await adapter.updateSpecRaw(slug, content);
          set((state) => ({
            currentDocument: state.currentDocument
              ? { ...state.currentDocument, parsed: spec }
              : null,
            isDirty: false,
            lastSavedAt: new Date(),
            saving: false,
          }));
        } else if (parsed) {
          // Structured data save
          const result = await adapter.updateSpec(slug, parsed as Specification);
          set((state) => ({
            currentDocument: state.currentDocument
              ? { ...state.currentDocument, parsed: result.spec, content: result.raw }
              : null,
            isDirty: false,
            lastSavedAt: new Date(),
            saving: false,
          }));
        }
      } else if (artifact === 'plan' && parsed) {
        const plan = await adapter.updatePlan(slug, parsed as Plan);
        set((state) => ({
          currentDocument: state.currentDocument
            ? { ...state.currentDocument, parsed: plan }
            : null,
          isDirty: false,
          lastSavedAt: new Date(),
          saving: false,
        }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save document';
      set({ error: message, saving: false });
    }
  },

  switchMode: (mode) => set({ mode }),

  updateContent: (content) => {
    set((state) => ({
      currentDocument: state.currentDocument
        ? { ...state.currentDocument, content }
        : null,
      isDirty: true,
    }));
  },

  updateParsed: (parsed) => {
    set((state) => ({
      currentDocument: state.currentDocument
        ? { ...state.currentDocument, parsed }
        : null,
      isDirty: true,
    }));
  },

  markClean: () => set({ isDirty: false, lastSavedAt: new Date() }),

  reset: () =>
    set({
      currentDocument: null,
      mode: 'form',
      isDirty: false,
      lastSavedAt: null,
      etag: null,
      loading: false,
      saving: false,
      error: null,
    }),
}));
