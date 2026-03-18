import type {
  Feature,
  FeatureStatus,
  Specification,
  Plan,
  Task,
  TaskStatus,
  Constitution,
  FileChangeEvent,
  Project,
} from '../types';
import type { BackendAdapter } from './backend-adapter';

/**
 * Tauri IPC adapter — calls Rust commands via `@tauri-apps/api/core`.
 *
 * Each method maps 1:1 to a Tauri command defined in the desktop package's
 * `src-tauri/src/commands.rs`.
 */
class TauriAdapter implements BackendAdapter {
  private async invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
    // Dynamic import so the module can be tree-shaken in web builds
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<T>(command, args);
  }

  // ---- Features ---------------------------------------------------------

  async listFeatures(filter?: { status?: FeatureStatus }): Promise<Feature[]> {
    return this.invoke<Feature[]>('list_features', filter ? { filter } : undefined);
  }

  async listAllFeatures(filter?: { status?: FeatureStatus }): Promise<Feature[]> {
    return this.listFeatures(filter);
  }

  async getFeature(slug: string): Promise<{
    feature: Feature;
    spec: Specification;
    plan: Plan | null;
    tasks: Task[] | null;
  }> {
    return this.invoke('get_feature', { slug });
  }

  async createFeature(
    description: string,
    shortName?: string,
  ): Promise<{ feature: Feature; spec: Specification }> {
    return this.invoke('create_feature', { description, shortName });
  }

  async deleteFeature(slug: string): Promise<boolean> {
    const result = await this.invoke<{ success: boolean }>('delete_feature', { slug });
    return result.success;
  }

  // ---- Specifications ---------------------------------------------------

  async getSpec(slug: string): Promise<Specification> {
    return this.invoke<Specification>('get_spec', { slug });
  }

  async updateSpec(
    slug: string,
    spec: Specification,
  ): Promise<{ spec: Specification; raw: string }> {
    return this.invoke('update_spec', { slug, spec });
  }

  async updateSpecRaw(slug: string, markdown: string): Promise<Specification> {
    return this.invoke<Specification>('update_spec_raw', { slug, markdown });
  }

  // ---- Plans ------------------------------------------------------------

  async getPlan(slug: string): Promise<Plan> {
    return this.invoke<Plan>('get_plan', { slug });
  }

  async generatePlan(slug: string): Promise<Plan> {
    return this.invoke<Plan>('generate_plan', { slug });
  }

  async updatePlan(slug: string, plan: Plan): Promise<Plan> {
    const result = await this.invoke<{ plan: Plan }>('update_plan', { slug, plan });
    return result.plan;
  }

  // ---- Tasks ------------------------------------------------------------

  async listTasks(slug: string): Promise<Task[]> {
    return this.invoke<Task[]>('list_tasks', { slug });
  }

  async generateTasks(slug: string): Promise<Task[]> {
    const result = await this.invoke<{ tasks: Task[] }>('generate_tasks', { slug });
    return result.tasks;
  }

  async updateTaskStatus(
    slug: string,
    taskId: string,
    status: TaskStatus,
  ): Promise<{ task: Task; affectedTasks: Task[] }> {
    return this.invoke('update_task_status', { slug, taskId, status });
  }

  // ---- Constitution -----------------------------------------------------

  async getConstitution(): Promise<Constitution | null> {
    return this.invoke<Constitution | null>('get_constitution');
  }

  async updateConstitution(constitution: Constitution): Promise<Constitution> {
    const result = await this.invoke<{ constitution: Constitution }>('update_constitution', {
      constitution,
    });
    return result.constitution;
  }

  // ---- File events ------------------------------------------------------

  onFileChange(callback: (event: FileChangeEvent) => void): () => void {
    let unlisten: (() => void) | null = null;

    // Set up the listener asynchronously
    import('@tauri-apps/api/event').then(({ listen }) => {
      listen<FileChangeEvent>('fs-change', (event) => {
        callback(event.payload);
      }).then((fn) => {
        unlisten = fn;
      });
    });

    // Return a synchronous unsubscribe handle
    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }

  // ---- Projects -------------------------------------------------------

  async listProjects(): Promise<Project[]> {
    return this.invoke<Project[]>('list_projects');
  }

  async openProject(path: string, name?: string): Promise<Project> {
    return this.invoke<Project>('open_project', { path, name });
  }

  async initProject(path: string): Promise<Project> {
    return this.invoke<Project>('init_project', { path });
  }

  async updateProject(id: string, updates: Partial<Pick<Project, 'name' | 'description'>>): Promise<Project> {
    return this.invoke<Project>('update_project', { id, ...updates });
  }

  async removeProject(id: string): Promise<void> {
    await this.invoke<void>('remove_project', { id });
  }

  async checkIsSpecProject(path: string): Promise<boolean> {
    return this.invoke<boolean>('check_is_spec_project', { path });
  }
}

/**
 * Factory function — creates a TauriAdapter.
 * Use via `useBackend()` hook which picks the right adapter automatically.
 */
export function createTauriAdapter(): BackendAdapter {
  return new TauriAdapter();
}

/**
 * Open a native folder picker dialog. Only works in Tauri environment.
 * Returns the selected path or null if cancelled.
 */
export async function pickFolder(): Promise<string | null> {
  const { open } = await import('@tauri-apps/plugin-dialog');
  const selected = await open({
    directory: true,
    multiple: false,
    title: 'Select Project Folder',
  });
  return typeof selected === 'string' ? selected : null;
}
