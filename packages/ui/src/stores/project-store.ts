import { create } from 'zustand';
import type { Project } from '../types';
import type { BackendAdapter } from '../lib/backend-adapter';

// ---------------------------------------------------------------------------
// State & Actions
// ---------------------------------------------------------------------------

export interface ProjectStoreState {
  // Data
  projects: Project[];
  activeProject: Project | null;
  loading: boolean;
  error: string | null;

  // Actions
  loadProjects: (backend: BackendAdapter) => Promise<void>;
  openProject: (backend: BackendAdapter, path: string, name?: string) => Promise<Project>;
  initProject: (backend: BackendAdapter, path: string) => Promise<Project>;
  updateProject: (backend: BackendAdapter, id: string, updates: Partial<Pick<Project, 'name' | 'description'>>) => Promise<void>;
  removeProject: (backend: BackendAdapter, id: string) => Promise<void>;
  setActiveProject: (project: Project | null) => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useProjectStore = create<ProjectStoreState>((set) => ({
  // --- Initial state ---
  projects: [],
  activeProject: null,
  loading: false,
  error: null,

  // --- Actions ---

  loadProjects: async (backend) => {
    set({ loading: true, error: null });
    try {
      const projects = await backend.listProjects();
      set({ projects, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load projects';
      set({ error: message, loading: false });
    }
  },

  openProject: async (backend, path, name) => {
    set({ error: null });
    try {
      const project = await backend.openProject(path, name);
      set((state) => ({
        activeProject: project,
        projects: [project, ...state.projects.filter((p) => p.id !== project.id)],
      }));
      if (typeof window !== 'undefined') {
        localStorage.setItem('spec-intelligence:project', project.path);
      }
      return project;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to open project';
      set({ error: message });
      throw err;
    }
  },

  initProject: async (backend, path) => {
    set({ error: null });
    try {
      const project = await backend.initProject(path);
      set((state) => ({
        activeProject: project,
        projects: [project, ...state.projects.filter((p) => p.id !== project.id)],
      }));
      if (typeof window !== 'undefined') {
        localStorage.setItem('spec-intelligence:project', project.path);
      }
      return project;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize project';
      set({ error: message });
      throw err;
    }
  },

  updateProject: async (backend, id, updates) => {
    try {
      const updated = await backend.updateProject(id, updates);
      set((state) => ({
        projects: state.projects.map((p) => (p.id === id ? updated : p)),
        activeProject: state.activeProject?.id === id ? updated : state.activeProject,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update project';
      set({ error: message });
    }
  },

  removeProject: async (backend, id) => {
    try {
      await backend.removeProject(id);
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        activeProject: state.activeProject?.id === id ? null : state.activeProject,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove project';
      set({ error: message });
    }
  },

  setActiveProject: (project) => {
    set({ activeProject: project });
    if (typeof window !== 'undefined') {
      if (project) {
        localStorage.setItem('spec-intelligence:project', project.path);
      } else {
        localStorage.removeItem('spec-intelligence:project');
      }
    }
  },
}));
