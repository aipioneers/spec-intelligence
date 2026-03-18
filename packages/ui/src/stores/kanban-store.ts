import { create } from 'zustand';
import type { Task, TaskStatus, TaskPhase } from '../types';
import type { BackendAdapter } from '../lib/backend-adapter';

// ---------------------------------------------------------------------------
// State & Actions
// ---------------------------------------------------------------------------

export interface KanbanStoreState {
  // Data
  tasks: Task[];
  loading: boolean;
  error: string | null;

  // Actions
  loadTasks: (adapter: BackendAdapter, slug: string) => Promise<void>;
  updateTaskStatus: (
    adapter: BackendAdapter,
    slug: string,
    taskId: string,
    status: TaskStatus,
  ) => Promise<void>;
  reorderTask: (taskId: string, newIndex: number) => void;
  setTasks: (tasks: Task[]) => void;

  // Computed helpers
  tasksByPhase: () => Record<TaskPhase, Task[]>;
  tasksByStatus: () => Record<TaskStatus, Task[]>;
  isTaskBlocked: (taskId: string) => boolean;
  getBlockedReason: (taskId: string) => string[];
}

// ---------------------------------------------------------------------------
// Status columns order
// ---------------------------------------------------------------------------

const ALL_STATUSES: TaskStatus[] = ['Todo', 'InProgress', 'Done', 'Blocked'];
const ALL_PHASES: TaskPhase[] = ['Setup', 'Foundation', 'UserStory', 'Polish'];

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useKanbanStore = create<KanbanStoreState>((set, get) => ({
  // --- Initial state ---
  tasks: [],
  loading: false,
  error: null,

  // --- Actions ---

  loadTasks: async (adapter, slug) => {
    set({ loading: true, error: null });
    try {
      const tasks = await adapter.listTasks(slug);
      set({ tasks, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load tasks';
      set({ error: message, loading: false });
    }
  },

  updateTaskStatus: async (adapter, slug, taskId, status) => {
    const { tasks } = get();
    const prevTasks = [...tasks];

    // Optimistic update
    set({
      tasks: tasks.map((t) => (t.id === taskId ? { ...t, status } : t)),
      error: null,
    });

    try {
      const result = await adapter.updateTaskStatus(slug, taskId, status);

      // Apply affected tasks updates from server response
      set((state) => ({
        tasks: state.tasks.map((t) => {
          if (t.id === result.task.id) return result.task;
          const affected = result.affectedTasks.find((a) => a.id === t.id);
          return affected ?? t;
        }),
      }));
    } catch (err) {
      // Rollback on error
      const message = err instanceof Error ? err.message : 'Failed to update task status';
      set({ tasks: prevTasks, error: message });
    }
  },

  reorderTask: (taskId, newIndex) => {
    set((state) => {
      const tasks = [...state.tasks];
      const currentIndex = tasks.findIndex((t) => t.id === taskId);
      if (currentIndex === -1) return state;

      const [task] = tasks.splice(currentIndex, 1);
      tasks.splice(newIndex, 0, task);
      return { tasks };
    });
  },

  setTasks: (tasks) => set({ tasks }),

  // --- Computed ---

  tasksByPhase: () => {
    const { tasks } = get();
    const grouped: Record<TaskPhase, Task[]> = {
      Setup: [],
      Foundation: [],
      UserStory: [],
      Polish: [],
    };

    for (const task of tasks) {
      if (grouped[task.phase]) {
        grouped[task.phase].push(task);
      }
    }

    return grouped;
  },

  tasksByStatus: () => {
    const { tasks } = get();
    const grouped: Record<TaskStatus, Task[]> = {
      Todo: [],
      InProgress: [],
      Done: [],
      Blocked: [],
    };

    for (const task of tasks) {
      // Check for dependency-based blocking
      const isBlocked = get().isTaskBlocked(task.id);
      const effectiveStatus = isBlocked && task.status !== 'Done' ? 'Blocked' : task.status;

      if (grouped[effectiveStatus]) {
        grouped[effectiveStatus].push({
          ...task,
          status: effectiveStatus,
        });
      }
    }

    return grouped;
  },

  isTaskBlocked: (taskId) => {
    const { tasks } = get();
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.dependencies.length === 0) return false;

    return task.dependencies.some((depId) => {
      const dep = tasks.find((t) => t.id === depId);
      return !dep || dep.status !== 'Done';
    });
  },

  getBlockedReason: (taskId) => {
    const { tasks } = get();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return [];

    return task.dependencies
      .filter((depId) => {
        const dep = tasks.find((t) => t.id === depId);
        return !dep || dep.status !== 'Done';
      })
      .map((depId) => {
        const dep = tasks.find((t) => t.id === depId);
        return dep
          ? `${dep.id}: ${dep.description} (${dep.status})`
          : `${depId}: unknown task`;
      });
  },
}));
