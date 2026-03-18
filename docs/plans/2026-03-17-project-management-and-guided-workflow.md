# Project Management & Guided Workflow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add native project management (folder dialog, project registry, project list page) and a guided workflow stepper (Specify → Clarify → Plan → Tasks → Implement) to the Spec-Kit desktop app.

**Architecture:** Tauri commands handle project registry in `~/.spec-kit/projects.json`. The BackendAdapter interface gets new project methods. A `WorkflowStepper` component derives the current step from file state and guides users through the pipeline. All changes work in both web (REST) and desktop (Tauri IPC) modes.

**Tech Stack:** Rust (Tauri 2 commands), TypeScript (React 18, Next.js 14), `tauri-plugin-dialog` for native folder picker, Zustand for project state.

---

### Task 1: Add `tauri-plugin-dialog` dependency

**Files:**
- Modify: `packages/desktop/src-tauri/Cargo.toml`
- Modify: `packages/desktop/src-tauri/src/main.rs`

**Step 1: Add the dialog plugin to Cargo.toml**

In `packages/desktop/src-tauri/Cargo.toml`, add to `[dependencies]`:

```toml
tauri-plugin-dialog = "2"
```

**Step 2: Register the plugin in main.rs**

In `packages/desktop/src-tauri/src/main.rs`, add the plugin:

```rust
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())  // <-- ADD THIS
        .invoke_handler(tauri::generate_handler![
            // ... existing commands ...
```

**Step 3: Verify it compiles**

Run: `cd packages/desktop/src-tauri && cargo check`
Expected: Compiles without errors

**Step 4: Commit**

```bash
git add packages/desktop/src-tauri/Cargo.toml packages/desktop/src-tauri/src/main.rs
git commit -m "feat: add tauri-plugin-dialog for native folder picker"
```

---

### Task 2: Add Rust project management commands

**Files:**
- Create: `packages/desktop/src-tauri/src/commands/projects.rs`
- Modify: `packages/desktop/src-tauri/src/commands/mod.rs`
- Modify: `packages/desktop/src-tauri/src/main.rs`

**Step 1: Create `projects.rs` with project registry commands**

```rust
// packages/desktop/src-tauri/src/commands/projects.rs

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub path: String,
    pub last_opened: String,
    pub created_at: String,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ProjectRegistry {
    projects: Vec<Project>,
}

fn registry_path() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    home.join(".spec-kit").join("projects.json")
}

fn load_registry() -> ProjectRegistry {
    let path = registry_path();
    if path.exists() {
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(registry) = serde_json::from_str(&content) {
                return registry;
            }
        }
    }
    ProjectRegistry { projects: vec![] }
}

fn save_registry(registry: &ProjectRegistry) -> Result<(), String> {
    let path = registry_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }
    let json = serde_json::to_string_pretty(registry)
        .map_err(|e| format!("Failed to serialize registry: {}", e))?;
    fs::write(&path, json)
        .map_err(|e| format!("Failed to write registry: {}", e))?;
    Ok(())
}

fn count_features(project_path: &str) -> usize {
    let specs_dir = PathBuf::from(project_path).join("specs");
    if !specs_dir.exists() {
        return 0;
    }
    fs::read_dir(&specs_dir)
        .map(|entries| {
            entries
                .filter_map(|e| e.ok())
                .filter(|e| {
                    e.path().is_dir()
                        && e.file_name()
                            .to_str()
                            .map_or(false, |n| n.len() >= 4 && n[..3].chars().all(|c| c.is_ascii_digit()))
                })
                .count()
        })
        .unwrap_or(0)
}

fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339()
}

#[tauri::command]
pub fn list_projects() -> Result<Vec<Project>, String> {
    let registry = load_registry();
    // Filter out projects whose paths no longer exist
    let valid: Vec<Project> = registry
        .projects
        .into_iter()
        .filter(|p| PathBuf::from(&p.path).exists())
        .collect();
    Ok(valid)
}

#[tauri::command]
pub fn open_project(path: String, name: Option<String>) -> Result<Project, String> {
    let abs_path = PathBuf::from(&path)
        .canonicalize()
        .map_err(|e| format!("Invalid path: {}", e))?;
    let path_str = abs_path.to_string_lossy().to_string();

    let mut registry = load_registry();

    // Check if already registered
    if let Some(existing) = registry.projects.iter_mut().find(|p| p.path == path_str) {
        existing.last_opened = now_iso();
        save_registry(&registry)?;
        return Ok(existing.clone());
    }

    // Register new project
    let display_name = name.unwrap_or_else(|| {
        abs_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("Unnamed")
            .to_string()
    });

    let project = Project {
        id: Uuid::new_v4().to_string(),
        name: display_name,
        path: path_str,
        last_opened: now_iso(),
        created_at: now_iso(),
        description: None,
    };

    registry.projects.insert(0, project.clone());
    save_registry(&registry)?;

    Ok(project)
}

#[tauri::command]
pub fn init_project(path: String) -> Result<Project, String> {
    let project_path = PathBuf::from(&path);

    // Create directory if it doesn't exist
    if !project_path.exists() {
        fs::create_dir_all(&project_path)
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    // Create specs/ directory
    let specs_dir = project_path.join("specs");
    if !specs_dir.exists() {
        fs::create_dir_all(&specs_dir)
            .map_err(|e| format!("Failed to create specs directory: {}", e))?;
    }

    // Create constitution.md template
    let constitution_path = project_path.join("constitution.md");
    if !constitution_path.exists() {
        let template = r#"# Project Constitution

**Version**: 1.0
**Last Amended**: {{date}}

## Core Principles

### Quality First

Prioritize correctness and maintainability over speed.

**Rationale**: Technical debt compounds; investing in quality early saves time long-term.

## Constraints

- All features must have specifications before implementation
- Tests are required for all business logic

## Development Guidelines

- Follow the Specify → Clarify → Plan → Tasks → Implement workflow
- Keep specifications up to date with implementation changes
"#;
        let content = template.replace("{{date}}", &chrono::Utc::now().format("%Y-%m-%d").to_string());
        fs::write(&constitution_path, content)
            .map_err(|e| format!("Failed to create constitution.md: {}", e))?;
    }

    // Register the project
    open_project(path, None)
}

#[tauri::command]
pub fn update_project(id: String, name: Option<String>, description: Option<String>) -> Result<Project, String> {
    let mut registry = load_registry();

    let project = registry
        .projects
        .iter_mut()
        .find(|p| p.id == id)
        .ok_or_else(|| format!("Project not found: {}", id))?;

    if let Some(n) = name {
        project.name = n;
    }
    if let Some(d) = description {
        project.description = Some(d);
    }

    let updated = project.clone();
    save_registry(&registry)?;

    Ok(updated)
}

#[tauri::command]
pub fn remove_project(id: String) -> Result<(), String> {
    let mut registry = load_registry();
    registry.projects.retain(|p| p.id != id);
    save_registry(&registry)?;
    Ok(())
}

#[tauri::command]
pub fn check_is_spec_project(path: String) -> Result<bool, String> {
    let specs_dir = PathBuf::from(&path).join("specs");
    Ok(specs_dir.exists())
}
```

**Step 2: Add `uuid` and `dirs` to Cargo.toml**

```toml
uuid = { version = "1", features = ["v4"] }
dirs = "5"
```

**Step 3: Register module and commands in mod.rs**

Add to `packages/desktop/src-tauri/src/commands/mod.rs`:

```rust
pub mod projects;
```

**Step 4: Register commands in main.rs invoke_handler**

Add to the `generate_handler![]` macro in `main.rs`:

```rust
// Project commands
commands::projects::list_projects,
commands::projects::open_project,
commands::projects::init_project,
commands::projects::update_project,
commands::projects::remove_project,
commands::projects::check_is_spec_project,
```

**Step 5: Verify it compiles**

Run: `cd packages/desktop/src-tauri && cargo check`
Expected: Compiles without errors

**Step 6: Commit**

```bash
git add packages/desktop/src-tauri/src/commands/projects.rs \
       packages/desktop/src-tauri/src/commands/mod.rs \
       packages/desktop/src-tauri/src/main.rs \
       packages/desktop/src-tauri/Cargo.toml
git commit -m "feat: add Rust project management commands"
```

---

### Task 3: Add Project type and BackendAdapter methods

**Files:**
- Modify: `packages/ui/src/types/index.ts`
- Modify: `packages/ui/src/lib/backend-adapter.ts`

**Step 1: Add Project type to types/index.ts**

Add after the `UserProfile` interface:

```typescript
// ── Project ───────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  path: string;
  lastOpened: string;
  createdAt: string;
  description?: string;
}

export type WorkflowStep = 'specify' | 'clarify' | 'plan' | 'tasks' | 'implement' | 'complete';
```

**Step 2: Add project methods to BackendAdapter**

Add a new section to `packages/ui/src/lib/backend-adapter.ts`:

```typescript
  // ---- Projects -------------------------------------------------------

  /** List all registered projects. */
  listProjects(): Promise<Project[]>;

  /** Open (and register) a project by path. */
  openProject(path: string, name?: string): Promise<Project>;

  /** Initialize a new project at the given path. */
  initProject(path: string): Promise<Project>;

  /** Update project metadata (name, description). */
  updateProject(id: string, updates: Partial<Pick<Project, 'name' | 'description'>>): Promise<Project>;

  /** Remove project from registry (does not delete files). */
  removeProject(id: string): Promise<void>;

  /** Check if a path is already a Spec-Kit project (has specs/). */
  checkIsSpecProject(path: string): Promise<boolean>;
```

Add `Project` to the import from `'../types'`.

**Step 3: Commit**

```bash
git add packages/ui/src/types/index.ts packages/ui/src/lib/backend-adapter.ts
git commit -m "feat: add Project type and BackendAdapter project methods"
```

---

### Task 4: Implement project methods in TauriAdapter

**Files:**
- Modify: `packages/ui/src/lib/tauri-adapter.ts`

**Step 1: Add project methods to TauriAdapter class**

Add after the `onFileChange` method:

```typescript
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
```

Add `Project` to the import from `'../types'`.

**Step 2: Commit**

```bash
git add packages/ui/src/lib/tauri-adapter.ts
git commit -m "feat: implement project methods in TauriAdapter"
```

---

### Task 5: Implement project methods in RestAdapter

**Files:**
- Modify: `packages/ui/src/lib/rest-adapter.ts`
- Modify: `packages/web/src/app/api/projects/route.ts`

**Step 1: Add project methods to RestAdapter class**

Add after the `onFileChange` method in `rest-adapter.ts`:

```typescript
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
```

Add `Project` to the import from `'../types'`.

**Step 2: Update the web API route to return Project objects with `id`**

Rewrite `packages/web/src/app/api/projects/route.ts` to use the `Project` type with UUIDs, and add PATCH/DELETE endpoints. This requires adding a `[id]/route.ts` file for single-project operations.

**Step 3: Create `packages/web/src/app/api/projects/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const PROJECTS_FILE = join(homedir(), ".spec-kit", "projects.json");

function loadProjects() {
  try {
    if (existsSync(PROJECTS_FILE)) {
      return JSON.parse(readFileSync(PROJECTS_FILE, "utf-8")).projects ?? [];
    }
  } catch {}
  return [];
}

function saveProjects(projects: unknown[]) {
  const dir = join(homedir(), ".spec-kit");
  if (!existsSync(dir)) {
    const { mkdirSync } = require("node:fs");
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(PROJECTS_FILE, JSON.stringify({ projects }, null, 2), "utf-8");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  const body = await request.json();
  const projects = loadProjects();
  const idx = projects.findIndex((p: any) => p.id === id);
  if (idx === -1) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Project not found" } },
      { status: 404 },
    );
  }
  if (body.name) projects[idx].name = body.name;
  if (body.description !== undefined) projects[idx].description = body.description;
  saveProjects(projects);
  return NextResponse.json({ project: projects[idx] });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  const projects = loadProjects().filter((p: any) => p.id !== id);
  saveProjects(projects);
  return NextResponse.json({ success: true });
}
```

**Step 4: Add `/api/projects/check` route**

Create `packages/web/src/app/api/projects/check/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { existsSync } from "node:fs";
import { join } from "node:path";

export async function POST(request: NextRequest) {
  const { path } = await request.json();
  const isProject = existsSync(join(path, "specs"));
  return NextResponse.json({ isProject });
}
```

**Step 5: Update the main projects route to use Project type with IDs**

Modify `packages/web/src/app/api/projects/route.ts` to generate UUIDs for projects and store them in the registry file.

**Step 6: Commit**

```bash
git add packages/ui/src/lib/rest-adapter.ts \
       packages/web/src/app/api/projects/route.ts \
       packages/web/src/app/api/projects/\[id\]/route.ts \
       packages/web/src/app/api/projects/check/route.ts
git commit -m "feat: implement project methods in RestAdapter and web API"
```

---

### Task 6: Create project store (Zustand)

**Files:**
- Create: `packages/ui/src/stores/project-store.ts`
- Modify: `packages/ui/src/index.ts`

**Step 1: Create the store**

```typescript
// packages/ui/src/stores/project-store.ts

import { create } from 'zustand';
import type { Project } from '../types';
import type { BackendAdapter } from '../lib/backend-adapter';

export interface ProjectStoreState {
  projects: Project[];
  activeProject: Project | null;
  loading: boolean;
  error: string | null;

  loadProjects: (backend: BackendAdapter) => Promise<void>;
  openProject: (backend: BackendAdapter, path: string, name?: string) => Promise<Project>;
  initProject: (backend: BackendAdapter, path: string) => Promise<Project>;
  updateProject: (backend: BackendAdapter, id: string, updates: Partial<Pick<Project, 'name' | 'description'>>) => Promise<void>;
  removeProject: (backend: BackendAdapter, id: string) => Promise<void>;
  setActiveProject: (project: Project | null) => void;
}

export const useProjectStore = create<ProjectStoreState>((set, get) => ({
  projects: [],
  activeProject: null,
  loading: false,
  error: null,

  loadProjects: async (backend) => {
    set({ loading: true, error: null });
    try {
      const projects = await backend.listProjects();
      set({ projects, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load projects', loading: false });
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
      set({ error: err instanceof Error ? err.message : 'Failed to update project' });
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
      set({ error: err instanceof Error ? err.message : 'Failed to remove project' });
    }
  },

  setActiveProject: (project) => {
    set({ activeProject: project });
    if (typeof window !== 'undefined') {
      if (project) {
        localStorage.setItem('spec-kit:project', project.path);
      } else {
        localStorage.removeItem('spec-kit:project');
      }
    }
  },
}));
```

**Step 2: Export from index.ts**

Add to `packages/ui/src/index.ts`:

```typescript
export { useProjectStore } from "./stores/project-store";
export type { ProjectStoreState } from "./stores/project-store";
```

**Step 3: Commit**

```bash
git add packages/ui/src/stores/project-store.ts packages/ui/src/index.ts
git commit -m "feat: add Zustand project store"
```

---

### Task 7: Create WorkflowStepper component

**Files:**
- Create: `packages/ui/src/components/workflow/WorkflowStepper.tsx`
- Create: `packages/ui/src/components/workflow/useWorkflowStep.ts`
- Modify: `packages/ui/src/index.ts`

**Step 1: Create the workflow step derivation hook**

```typescript
// packages/ui/src/components/workflow/useWorkflowStep.ts

import { useMemo } from 'react';
import type { Feature, Specification, Plan, Task, WorkflowStep } from '../../types';

export interface WorkflowStepInfo {
  id: WorkflowStep;
  label: string;
  description: string;
  status: 'complete' | 'active' | 'upcoming';
  href: string;
}

export function deriveWorkflowStep(
  feature: Feature,
  spec: Specification | null,
  plan: Plan | null,
  tasks: Task[] | null,
): WorkflowStep {
  // No spec content yet
  if (!spec || (!spec.userStories.length && !spec.requirements.length)) {
    return 'specify';
  }

  // Has clarification markers
  if (spec.requirements.some((r) => r.hasClarificationMarker)) {
    return 'clarify';
  }

  // No plan yet
  if (!plan) {
    return 'plan';
  }

  // No tasks yet
  if (!tasks || tasks.length === 0) {
    return 'tasks';
  }

  // All tasks done
  const allDone = tasks.every((t) => t.status === 'Done');
  if (allDone) {
    return 'complete';
  }

  return 'implement';
}

const STEPS: { id: WorkflowStep; label: string; description: string }[] = [
  { id: 'specify', label: 'Specify', description: 'Define user stories and requirements' },
  { id: 'clarify', label: 'Clarify', description: 'Resolve open questions' },
  { id: 'plan', label: 'Plan', description: 'Create implementation plan' },
  { id: 'tasks', label: 'Tasks', description: 'Break down into actionable tasks' },
  { id: 'implement', label: 'Implement', description: 'Execute tasks to completion' },
];

export function useWorkflowSteps(
  feature: Feature,
  spec: Specification | null,
  plan: Plan | null,
  tasks: Task[] | null,
): { steps: WorkflowStepInfo[]; currentStep: WorkflowStep } {
  return useMemo(() => {
    const current = deriveWorkflowStep(feature, spec, plan, tasks);
    const currentIdx = STEPS.findIndex((s) => s.id === current);

    const steps: WorkflowStepInfo[] = STEPS.map((step, idx) => ({
      ...step,
      status:
        current === 'complete'
          ? 'complete' as const
          : idx < currentIdx
            ? 'complete' as const
            : idx === currentIdx
              ? 'active' as const
              : 'upcoming' as const,
      href: `/features/${feature.slug}/${step.id === 'specify' ? 'spec' : step.id === 'implement' ? 'tasks' : step.id}`,
    }));

    return { steps, currentStep: current };
  }, [feature, spec, plan, tasks]);
}
```

**Step 2: Create the WorkflowStepper component**

```typescript
// packages/ui/src/components/workflow/WorkflowStepper.tsx

import type { WorkflowStepInfo } from './useWorkflowStep';

interface WorkflowStepperProps {
  steps: WorkflowStepInfo[];
  onStepClick?: (step: WorkflowStepInfo) => void;
}

export function WorkflowStepper({ steps, onStepClick }: WorkflowStepperProps) {
  return (
    <nav className="flex items-center gap-1" aria-label="Workflow progress">
      {steps.map((step, idx) => (
        <div key={step.id} className="flex items-center">
          {/* Step */}
          <button
            onClick={() => step.status !== 'upcoming' && onStepClick?.(step)}
            disabled={step.status === 'upcoming'}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              step.status === 'active'
                ? 'bg-accent-3 text-accent-11'
                : step.status === 'complete'
                  ? 'text-green-600 hover:bg-gray-3 cursor-pointer'
                  : 'text-gray-8 cursor-default'
            }`}
            title={step.description}
          >
            {/* Step indicator */}
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                step.status === 'active'
                  ? 'bg-accent-9 text-white'
                  : step.status === 'complete'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-3 text-gray-8'
              }`}
            >
              {step.status === 'complete' ? (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : (
                idx + 1
              )}
            </span>
            <span className="hidden sm:inline">{step.label}</span>
          </button>

          {/* Connector line */}
          {idx < steps.length - 1 && (
            <div
              className={`mx-1 h-px w-6 ${
                step.status === 'complete' ? 'bg-green-300' : 'bg-gray-4'
              }`}
            />
          )}
        </div>
      ))}
    </nav>
  );
}
```

**Step 3: Export from index.ts**

Add to `packages/ui/src/index.ts`:

```typescript
// Components — workflow
export { WorkflowStepper } from "./components/workflow/WorkflowStepper";
export { useWorkflowSteps, deriveWorkflowStep } from "./components/workflow/useWorkflowStep";
export type { WorkflowStepInfo } from "./components/workflow/useWorkflowStep";
```

**Step 4: Commit**

```bash
git add packages/ui/src/components/workflow/WorkflowStepper.tsx \
       packages/ui/src/components/workflow/useWorkflowStep.ts \
       packages/ui/src/index.ts
git commit -m "feat: add WorkflowStepper component and step derivation hook"
```

---

### Task 8: Create Projects page

**Files:**
- Create: `packages/web/src/app/(dashboard)/projects/page.tsx`
- Modify: `packages/web/src/app/(dashboard)/layout.tsx` (add Projects nav item)

**Step 1: Create the projects page**

Create `packages/web/src/app/(dashboard)/projects/page.tsx` with:
- Project list showing name, path, feature count, last opened
- "Open Folder" button (uses native dialog in Tauri, path input in web)
- Edit name inline (click to edit)
- Remove from list (with confirmation)
- "Initialize" prompt when folder has no `specs/`
- Uses `useProjectStore` for state

**Step 2: Add `/projects` to sidebar navigation in layout.tsx**

Add a new nav item in `NAV_ITEMS` array between Dashboard and Features:

```typescript
{
  label: "Projects",
  href: "/projects",
  iconPath: "M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z",
},
```

**Step 3: Update ProjectSwitcher to use the store and link to /projects**

**Step 4: Commit**

```bash
git add packages/web/src/app/\(dashboard\)/projects/page.tsx \
       packages/web/src/app/\(dashboard\)/layout.tsx
git commit -m "feat: add projects page with list, open, rename, remove"
```

---

### Task 9: Add WorkflowStepper to feature detail pages

**Files:**
- Modify: `packages/web/src/app/(dashboard)/features/[slug]/layout.tsx` or create it

**Step 1: Create a feature detail layout with the stepper**

Create `packages/web/src/app/(dashboard)/features/[slug]/layout.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useBackend, useWorkflowSteps, WorkflowStepper } from "@spec-kit/ui";
import type { Feature, Specification, Plan, Task } from "@spec-kit/ui";

export default function FeatureDetailLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const backend = useBackend();

  const [feature, setFeature] = useState<Feature | null>(null);
  const [spec, setSpec] = useState<Specification | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);

  useEffect(() => {
    backend.getFeature(slug).then((data) => {
      setFeature(data.feature);
      setSpec(data.spec);
      setPlan(data.plan);
      setTasks(data.tasks);
    });
  }, [backend, slug]);

  const { steps } = useWorkflowSteps(
    feature ?? { slug } as Feature,
    spec,
    plan,
    tasks,
  );

  return (
    <div>
      {/* Workflow stepper header */}
      {feature && (
        <div className="border-b border-gray-6 bg-gray-2 px-4 py-3">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-12">{spec?.title ?? feature.slug}</h1>
              <p className="text-xs text-gray-9">{feature.slug}</p>
            </div>
            <WorkflowStepper
              steps={steps}
              onStepClick={(step) => router.push(step.href)}
            />
          </div>
        </div>
      )}

      {/* Page content */}
      {children}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add packages/web/src/app/\(dashboard\)/features/\[slug\]/layout.tsx
git commit -m "feat: add workflow stepper to feature detail pages"
```

---

### Task 10: Update project selector page (/) to use store

**Files:**
- Modify: `packages/web/src/app/page.tsx`

**Step 1: Rewrite to use `useProjectStore` and `useBackend`**

Update the page to:
- Use `useProjectStore` instead of raw fetch calls
- Keep the "Open Project" / "New Project" tabs
- On "New Project", call `backend.initProject()` instead of raw POST
- Use `setActiveProject()` to persist selection

**Step 2: Commit**

```bash
git add packages/web/src/app/page.tsx
git commit -m "refactor: use project store in project selector page"
```

---

### Task 11: Wire up native folder dialog in Tauri

**Files:**
- Modify: `packages/ui/src/lib/tauri-adapter.ts` (add `pickFolder` method)
- Or handle in the desktop-specific page component

**Step 1: Add folder picker utility**

The Tauri dialog plugin exposes `open()` from `@tauri-apps/plugin-dialog`. Add a helper:

```typescript
// In tauri-adapter.ts or a new file
export async function pickFolder(): Promise<string | null> {
  const { open } = await import('@tauri-apps/plugin-dialog');
  const selected = await open({
    directory: true,
    multiple: false,
    title: 'Select Project Folder',
  });
  return typeof selected === 'string' ? selected : null;
}
```

Add `@tauri-apps/plugin-dialog` to `packages/desktop/package.json` dependencies.

**Step 2: Install the npm package**

Run: `cd packages/desktop && npm install @tauri-apps/plugin-dialog`

**Step 3: Commit**

```bash
git add packages/ui/src/lib/tauri-adapter.ts packages/desktop/package.json
git commit -m "feat: add native folder picker via tauri-plugin-dialog"
```

---

### Task 12: Integration test — full flow

**Step 1: Start the web dev server**

Run: `cd packages/web && PORT=3456 npx next dev --port 3456`

**Step 2: Test project management flow**

1. Open `http://localhost:3456/` — should see project selector
2. Enter a test path (e.g. `/tmp/test-speckit-project`)
3. Click "New Project" — should create specs/ and constitution.md
4. Should redirect to `/features` — empty feature list
5. Navigate to `/projects` — should see the project in the list
6. Click the project name to edit it
7. Open sidebar — should see project name in the switcher

**Step 3: Test workflow stepper**

1. Create a new feature from `/features`
2. Should see stepper at top: Specify (active) → Clarify → Plan → Tasks → Implement
3. Edit the spec — add user stories and requirements
4. Stepper should advance based on file content

**Step 4: Test Tauri app (if Rust toolchain available)**

Run: `cd packages/desktop && npm run dev`
Should open native window with the same UI + native folder dialog.

**Step 5: Clean up test data**

```bash
rm -rf /tmp/test-speckit-project
```

---

## Implementation Order Summary

| Task | What | Dependencies |
|------|------|-------------|
| 1 | Add tauri-plugin-dialog | None |
| 2 | Rust project commands | Task 1 |
| 3 | Project type + BackendAdapter | None |
| 4 | TauriAdapter project methods | Task 2, 3 |
| 5 | RestAdapter + web API | Task 3 |
| 6 | Zustand project store | Task 3 |
| 7 | WorkflowStepper component | None |
| 8 | Projects page | Task 5, 6 |
| 9 | Stepper in feature detail | Task 7 |
| 10 | Update project selector | Task 6 |
| 11 | Native folder dialog | Task 1 |
| 12 | Integration test | All |

**Parallelizable:** Tasks 1+3+7 can run in parallel. Tasks 4+5+6 can run in parallel after 3 is done.
