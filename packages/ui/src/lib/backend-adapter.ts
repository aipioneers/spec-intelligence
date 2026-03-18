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

/**
 * BackendAdapter — abstraction layer over the data backend.
 *
 * Two concrete implementations exist:
 *  - TauriAdapter  (desktop, IPC via @tauri-apps/api)
 *  - RestAdapter   (self-hosted web, HTTP via fetch + SSE)
 *
 * Every UI component interacts with the backend exclusively through this
 * interface so the same React tree runs in both environments.
 */
export interface BackendAdapter {
  // ---- Features ---------------------------------------------------------

  /** List all features, optionally filtered by status. */
  listFeatures(filter?: { status?: FeatureStatus }): Promise<Feature[]>;

  /** List features across all projects, optionally filtered by status. */
  listAllFeatures(filter?: { status?: FeatureStatus }): Promise<Feature[]>;

  /** Get a single feature with its spec, plan, and tasks. */
  getFeature(slug: string): Promise<{
    feature: Feature;
    spec: Specification;
    plan: Plan | null;
    tasks: Task[] | null;
  }>;

  /** Create a new feature from a description. */
  createFeature(
    description: string,
    shortName?: string,
  ): Promise<{ feature: Feature; spec: Specification }>;

  /** Delete a feature by slug. */
  deleteFeature(slug: string): Promise<boolean>;

  // ---- Specifications ---------------------------------------------------

  /** Get the parsed specification for a feature. */
  getSpec(slug: string): Promise<Specification>;

  /** Update a spec with structured data; returns the parsed spec and raw markdown. */
  updateSpec(
    slug: string,
    spec: Specification,
  ): Promise<{ spec: Specification; raw: string }>;

  /** Overwrite spec.md with raw markdown; returns re-parsed spec. */
  updateSpecRaw(slug: string, markdown: string): Promise<Specification>;

  // ---- Plans ------------------------------------------------------------

  /** Get the parsed plan for a feature. */
  getPlan(slug: string): Promise<Plan>;

  /** Generate a plan from the spec (creates plan.md). */
  generatePlan(slug: string): Promise<Plan>;

  /** Update an existing plan. */
  updatePlan(slug: string, plan: Plan): Promise<Plan>;

  // ---- Tasks ------------------------------------------------------------

  /** List tasks for a feature. */
  listTasks(slug: string): Promise<Task[]>;

  /** Generate tasks from the plan (creates tasks.md). */
  generateTasks(slug: string): Promise<Task[]>;

  /** Update a single task's status; returns affected tasks. */
  updateTaskStatus(
    slug: string,
    taskId: string,
    status: TaskStatus,
  ): Promise<{ task: Task; affectedTasks: Task[] }>;

  // ---- Constitution -----------------------------------------------------

  /** Get the project constitution, or null if none exists. */
  getConstitution(): Promise<Constitution | null>;

  /** Create or update the constitution. */
  updateConstitution(constitution: Constitution): Promise<Constitution>;

  // ---- File events ------------------------------------------------------

  /**
   * Subscribe to real-time file-change events.
   * Returns an unsubscribe function.
   */
  onFileChange(callback: (event: FileChangeEvent) => void): () => void;

  // ---- Projects -------------------------------------------------------

  /** List all registered projects. */
  listProjects(): Promise<Project[]>;

  /** Open (and register) a project by path. */
  openProject(path: string, name?: string): Promise<Project>;

  /** Initialize a new project at the given path (creates specs/ + constitution.md). */
  initProject(path: string): Promise<Project>;

  /** Update project metadata (name, description). */
  updateProject(id: string, updates: Partial<Pick<Project, 'name' | 'description'>>): Promise<Project>;

  /** Remove project from registry (does not delete files). */
  removeProject(id: string): Promise<void>;

  /** Check if a path is already a Spec Intelligence project (has specs/ directory). */
  checkIsSpecProject(path: string): Promise<boolean>;
}
