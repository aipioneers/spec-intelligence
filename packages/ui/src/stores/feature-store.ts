import { create } from 'zustand';
import type { Feature, FeatureStatus, Specification } from '../types';
import type { BackendAdapter } from '../lib/backend-adapter';

// ---------------------------------------------------------------------------
// State & Actions
// ---------------------------------------------------------------------------

export interface FeatureStoreState {
  // Data
  features: Feature[];
  loading: boolean;
  error: string | null;

  // Filters / sort
  searchQuery: string;
  statusFilter: FeatureStatus | null;
  sortBy: 'number' | 'name' | 'status' | 'created';

  // View state
  viewMode: 'list' | 'board';
  groupBy: 'status' | 'project';

  // Actions
  setViewMode: (mode: 'list' | 'board') => void;
  setGroupBy: (g: 'status' | 'project') => void;
  loadAllFeatures: (adapter: BackendAdapter) => Promise<void>;
  loadFeatures: (adapter: BackendAdapter) => Promise<void>;
  createFeature: (
    adapter: BackendAdapter,
    description: string,
    shortName?: string,
  ) => Promise<{ feature: Feature; spec: Specification }>;
  deleteFeature: (adapter: BackendAdapter, slug: string) => Promise<boolean>;
  setSearchQuery: (q: string) => void;
  setStatusFilter: (s: FeatureStatus | null) => void;
  setSortBy: (s: 'number' | 'name' | 'status' | 'created') => void;

  // Computed helper
  filteredFeatures: () => Feature[];
}

// ---------------------------------------------------------------------------
// Status ordering for sorting
// ---------------------------------------------------------------------------

const STATUS_ORDER: Record<FeatureStatus, number> = {
  Draft: 0,
  Clarifying: 1,
  Planned: 2,
  InProgress: 3,
  Complete: 4,
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useFeatureStore = create<FeatureStoreState>((set, get) => ({
  // --- Initial state ---
  features: [],
  loading: false,
  error: null,
  searchQuery: '',
  statusFilter: null,
  sortBy: 'number',
  viewMode: (typeof window !== 'undefined'
    ? (localStorage.getItem('spec-intelligence:viewMode') as 'list' | 'board') ?? 'list'
    : 'list') as 'list' | 'board',
  groupBy: 'status' as 'status' | 'project',

  // --- Actions ---

  loadFeatures: async (adapter) => {
    set({ loading: true, error: null });
    try {
      const filter = get().statusFilter ? { status: get().statusFilter! } : undefined;
      const features = await adapter.listFeatures(filter);
      set({ features, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load features';
      set({ error: message, loading: false });
    }
  },

  createFeature: async (adapter, description, shortName?) => {
    set({ loading: true, error: null });
    try {
      const result = await adapter.createFeature(description, shortName);
      set((state) => ({
        features: [...state.features, result.feature],
        loading: false,
      }));
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create feature';
      set({ error: message, loading: false });
      throw err;
    }
  },

  deleteFeature: async (adapter, slug) => {
    set({ error: null });
    try {
      const ok = await adapter.deleteFeature(slug);
      if (ok) {
        set((state) => ({
          features: state.features.filter((f) => f.slug !== slug),
        }));
      }
      return ok;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete feature';
      set({ error: message });
      return false;
    }
  },

  setSearchQuery: (q) => set({ searchQuery: q }),
  setStatusFilter: (s) => set({ statusFilter: s }),
  setSortBy: (s) => set({ sortBy: s }),

  setViewMode: (mode) => {
    set({ viewMode: mode });
    if (typeof window !== 'undefined') {
      localStorage.setItem('spec-intelligence:viewMode', mode);
    }
  },

  setGroupBy: (g) => set({ groupBy: g }),

  loadAllFeatures: async (adapter) => {
    set({ loading: true, error: null });
    try {
      const filter = get().statusFilter ? { status: get().statusFilter! } : undefined;
      const features = await adapter.listAllFeatures(filter);
      set({ features, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load features';
      set({ error: message, loading: false });
    }
  },

  // --- Computed ---

  filteredFeatures: () => {
    const { features, searchQuery, statusFilter, sortBy } = get();

    let result = [...features];

    // Apply status filter
    if (statusFilter) {
      result = result.filter((f) => f.status === statusFilter);
    }

    // Apply search query (match slug, shortName, or number)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (f) =>
          f.slug.toLowerCase().includes(q) ||
          f.shortName.toLowerCase().includes(q) ||
          f.number.includes(q) ||
          (f.projectName && f.projectName.toLowerCase().includes(q)),
      );
    }

    // Apply sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'number':
          return a.number.localeCompare(b.number);
        case 'name':
          return a.shortName.localeCompare(b.shortName);
        case 'status':
          return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        case 'created':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        default:
          return 0;
      }
    });

    return result;
  },
}));
