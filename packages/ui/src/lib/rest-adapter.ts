import type {
  Feature,
  FeatureStatus,
  Specification,
  Plan,
  Task,
  TaskStatus,
  Constitution,
  FileChangeEvent,
  ApiError,
  Project,
} from '../types';
import type { BackendAdapter } from './backend-adapter';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let body: ApiError | null = null;
    try {
      body = (await res.json()) as ApiError;
    } catch {
      // ignore parse errors
    }
    const message =
      body?.error?.message ?? `Request failed with status ${res.status}`;
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// REST Adapter
// ---------------------------------------------------------------------------

class RestAdapter implements BackendAdapter {
  private baseUrl: string;
  private projectRoot: string | null;

  constructor(baseUrl: string, projectRoot?: string | null) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.projectRoot = projectRoot ?? null;
  }

  setProjectRoot(root: string | null): void {
    this.projectRoot = root;
  }

  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  private h(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = { ...extra };
    if (this.projectRoot) {
      headers['X-Project-Root'] = this.projectRoot;
    }
    return headers;
  }

  // ---- Features ---------------------------------------------------------

  async listFeatures(filter?: { status?: FeatureStatus }): Promise<Feature[]> {
    const params = new URLSearchParams();
    if (filter?.status) params.set('status', filter.status);

    const query = params.toString();
    const path = query ? `/api/features?${query}` : '/api/features';
    const res = await fetch(this.url(path), { headers: this.h() });
    return handleResponse<Feature[]>(res);
  }

  async listAllFeatures(filter?: { status?: FeatureStatus }): Promise<Feature[]> {
    const params = new URLSearchParams();
    params.set('allProjects', 'true');
    if (filter?.status) params.set('status', filter.status);
    const path = `/api/features?${params.toString()}`;
    const res = await fetch(this.url(path), { headers: this.h() });
    return handleResponse<Feature[]>(res);
  }

  async getFeature(slug: string): Promise<{
    feature: Feature;
    spec: Specification;
    plan: Plan | null;
    tasks: Task[] | null;
  }> {
    const res = await fetch(this.url(`/api/features/${encodeURIComponent(slug)}`), {
      headers: this.h(),
    });
    return handleResponse(res);
  }

  async createFeature(
    description: string,
    shortName?: string,
  ): Promise<{ feature: Feature; spec: Specification }> {
    const res = await fetch(this.url('/api/features'), {
      method: 'POST',
      headers: this.h({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ description, shortName }),
    });
    return handleResponse(res);
  }

  async deleteFeature(slug: string): Promise<boolean> {
    const res = await fetch(this.url(`/api/features/${encodeURIComponent(slug)}`), {
      method: 'DELETE',
      headers: this.h(),
    });
    const result = await handleResponse<{ success: boolean }>(res);
    return result.success;
  }

  // ---- Specifications ---------------------------------------------------

  async getSpec(slug: string): Promise<Specification> {
    const res = await fetch(this.url(`/api/features/${encodeURIComponent(slug)}/spec`), {
      headers: this.h(),
    });
    return handleResponse<Specification>(res);
  }

  async updateSpec(
    slug: string,
    spec: Specification,
  ): Promise<{ spec: Specification; raw: string }> {
    const res = await fetch(this.url(`/api/features/${encodeURIComponent(slug)}/spec`), {
      method: 'PUT',
      headers: this.h({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(spec),
    });
    return handleResponse(res);
  }

  async updateSpecRaw(slug: string, markdown: string): Promise<Specification> {
    const res = await fetch(
      this.url(`/api/features/${encodeURIComponent(slug)}/spec/raw`),
      {
        method: 'PUT',
        headers: this.h({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ markdown }),
      },
    );
    const result = await handleResponse<{ spec: Specification }>(res);
    return result.spec;
  }

  // ---- Plans ------------------------------------------------------------

  async getPlan(slug: string): Promise<Plan> {
    const res = await fetch(this.url(`/api/features/${encodeURIComponent(slug)}/plan`), {
      headers: this.h(),
    });
    return handleResponse<Plan>(res);
  }

  async generatePlan(slug: string): Promise<Plan> {
    const res = await fetch(this.url(`/api/features/${encodeURIComponent(slug)}/plan`), {
      method: 'POST',
      headers: this.h(),
    });
    const result = await handleResponse<{ plan: Plan }>(res);
    return result.plan;
  }

  async updatePlan(slug: string, plan: Plan): Promise<Plan> {
    const res = await fetch(this.url(`/api/features/${encodeURIComponent(slug)}/plan`), {
      method: 'PUT',
      headers: this.h({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(plan),
    });
    const result = await handleResponse<{ plan: Plan }>(res);
    return result.plan;
  }

  // ---- Tasks ------------------------------------------------------------

  async listTasks(slug: string): Promise<Task[]> {
    const res = await fetch(this.url(`/api/features/${encodeURIComponent(slug)}/tasks`), {
      headers: this.h(),
    });
    return handleResponse<Task[]>(res);
  }

  async generateTasks(slug: string): Promise<Task[]> {
    const res = await fetch(this.url(`/api/features/${encodeURIComponent(slug)}/tasks`), {
      method: 'POST',
      headers: this.h(),
    });
    const result = await handleResponse<{ tasks: Task[] }>(res);
    return result.tasks;
  }

  async updateTaskStatus(
    slug: string,
    taskId: string,
    status: TaskStatus,
  ): Promise<{ task: Task; affectedTasks: Task[] }> {
    const res = await fetch(
      this.url(
        `/api/features/${encodeURIComponent(slug)}/tasks/${encodeURIComponent(taskId)}`,
      ),
      {
        method: 'PATCH',
        headers: this.h({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ status }),
      },
    );
    return handleResponse(res);
  }

  // ---- Constitution -----------------------------------------------------

  async getConstitution(): Promise<Constitution | null> {
    const res = await fetch(this.url('/api/constitution'), { headers: this.h() });
    if (res.status === 404) return null;
    return handleResponse<Constitution>(res);
  }

  async updateConstitution(constitution: Constitution): Promise<Constitution> {
    const res = await fetch(this.url('/api/constitution'), {
      method: 'PUT',
      headers: this.h({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(constitution),
    });
    const result = await handleResponse<{ constitution: Constitution }>(res);
    return result.constitution;
  }

  // ---- File events (SSE) ------------------------------------------------

  onFileChange(callback: (event: FileChangeEvent) => void): () => void {
    const eventSource = new EventSource(this.url('/api/events'));

    eventSource.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data) as FileChangeEvent;
        callback(event);
      } catch {
        // Ignore malformed events
      }
    };

    eventSource.onerror = () => {
      // EventSource will auto-reconnect
    };

    return () => {
      eventSource.close();
    };
  }

  // ---- Projects -------------------------------------------------------

  async listProjects(): Promise<Project[]> {
    const res = await fetch(this.url('/api/projects'), { headers: this.h() });
    const data = await handleResponse<{ projects: Project[] }>(res);
    return data.projects;
  }

  async openProject(path: string, name?: string): Promise<Project> {
    const res = await fetch(this.url('/api/projects'), {
      method: 'POST',
      headers: this.h({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ path, name, action: 'open' }),
    });
    const data = await handleResponse<{ project: Project }>(res);
    return data.project;
  }

  async initProject(path: string): Promise<Project> {
    const res = await fetch(this.url('/api/projects'), {
      method: 'POST',
      headers: this.h({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ path, action: 'create' }),
    });
    const data = await handleResponse<{ project: Project }>(res);
    return data.project;
  }

  async updateProject(id: string, updates: Partial<Pick<Project, 'name' | 'description'>>): Promise<Project> {
    const res = await fetch(this.url(`/api/projects/${encodeURIComponent(id)}`), {
      method: 'PATCH',
      headers: this.h({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(updates),
    });
    const data = await handleResponse<{ project: Project }>(res);
    return data.project;
  }

  async removeProject(id: string): Promise<void> {
    const res = await fetch(this.url(`/api/projects/${encodeURIComponent(id)}`), {
      method: 'DELETE',
      headers: this.h(),
    });
    await handleResponse<{ success: boolean }>(res);
  }

  async checkIsSpecProject(path: string): Promise<boolean> {
    const res = await fetch(this.url('/api/projects/check'), {
      method: 'POST',
      headers: this.h({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ path }),
    });
    const data = await handleResponse<{ isProject: boolean }>(res);
    return data.isProject;
  }
}

/**
 * Factory function — creates a RestAdapter pointed at the given base URL.
 * If projectRoot is provided, it will be sent as X-Project-Root header.
 */
export function createRestAdapter(baseUrl?: string, projectRoot?: string | null): BackendAdapter {
  const url = baseUrl ?? (typeof window !== 'undefined' ? window.location.origin : '');
  const root = projectRoot ?? (typeof window !== 'undefined' ? localStorage.getItem('spec-intelligence:project') : null);
  return new RestAdapter(url, root);
}
