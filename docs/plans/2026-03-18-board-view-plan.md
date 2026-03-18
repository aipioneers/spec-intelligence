# Board View Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Kanban board view to the Features page showing features from all projects, togglable with the existing list view.

**Architecture:** Extend the existing `GET /api/features` endpoint with an `allProjects=true` query parameter. Add `projectId` and `projectName` fields to the Feature type. Add view toggle and board component to the Features page. Store state lives in the existing `useFeatureStore`.

**Tech Stack:** TypeScript 5.4+, React 18, Next.js 14, Zustand, Tailwind CSS

---

### Task 1: Extend Feature type with project fields

**Files:**
- Modify: `packages/ui/src/types/index.ts`

**Step 1: Add optional project fields to Feature interface**

In `packages/ui/src/types/index.ts`, add two fields to the `Feature` interface (after `checklistPaths`):

```typescript
export interface Feature {
  number: string;
  shortName: string;
  slug: string;
  branchName: string;
  status: FeatureStatus;
  createdAt: string;
  specPath: string;
  planPath: string | null;
  tasksPath: string | null;
  checklistPaths: string[];
  projectId?: string;
  projectName?: string;
}
```

**Step 2: Verify no type errors**

Run: `cd packages/ui && npx tsc --noEmit`
Expected: PASS (fields are optional, no existing code breaks)

**Step 3: Commit**

```bash
git add packages/ui/src/types/index.ts
git commit -m "feat: add projectId and projectName to Feature type"
```

---

### Task 2: Add allProjects support to GET /api/features

**Files:**
- Modify: `packages/web/src/app/api/features/route.ts`

**Step 1: Import project registry helpers**

At the top of the file, add imports for reading the projects registry:

```typescript
import { homedir } from "node:os";
```

**Step 2: Add helper to load all projects**

Add this function before the GET handler:

```typescript
interface ProjectEntry {
  id: string;
  name: string;
  path: string;
}

function loadAllProjects(): ProjectEntry[] {
  const registryPath = join(homedir(), ".spec-intelligence", "projects.json");
  if (!existsSync(registryPath)) return [];
  try {
    const data = JSON.parse(readFileSync(registryPath, "utf-8"));
    const projects = Array.isArray(data) ? data : data.projects ?? [];
    return projects.filter(
      (p: ProjectEntry) => p.path && existsSync(join(p.path, "specs")),
    );
  } catch {
    return [];
  }
}
```

**Step 3: Modify GET handler to support allProjects**

Replace the existing GET handler with:

```typescript
export async function GET(request: NextRequest) {
  try {
    const allProjects = request.nextUrl.searchParams.get("allProjects") === "true";

    let features: Feature[] = [];

    if (allProjects) {
      // Multi-project mode: scan all registered projects
      const projects = loadAllProjects();
      for (const project of projects) {
        const specsDir = join(project.path, "specs");
        if (!existsSync(specsDir)) continue;
        const entries = readdirSync(specsDir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          const feature = buildFeature(specsDir, entry.name);
          if (feature) {
            feature.projectId = project.id;
            feature.projectName = project.name;
            features.push(feature);
          }
        }
      }
    } else {
      // Single-project mode (existing behavior)
      const root = getProjectRoot(request);
      const specsDir = join(root, "specs");
      if (!existsSync(specsDir)) {
        return NextResponse.json([], { status: 200 });
      }
      const entries = readdirSync(specsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const feature = buildFeature(specsDir, entry.name);
        if (feature) features.push(feature);
      }
    }

    // Apply optional status filter
    const statusParam = request.nextUrl.searchParams.get("status");
    if (statusParam) {
      const validStatuses: FeatureStatus[] = [
        "Draft", "Clarifying", "Planned", "InProgress", "Complete",
      ];
      if (validStatuses.includes(statusParam as FeatureStatus)) {
        features = features.filter((f) => f.status === statusParam);
      }
    }

    // Apply sort
    const sortParam =
      (request.nextUrl.searchParams.get("sort") as SortKey) ?? "number";
    features = sortFeatures(features, sortParam);

    return NextResponse.json(features, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message, details: null } },
      { status: 500 },
    );
  }
}
```

**Step 4: Verify the endpoint works**

Start the dev server: `cd packages/web && npx next dev --port 3000`

Test single project (existing): `curl -s http://localhost:3000/api/features -H "X-Project-Root: /path/to/project" | python3 -m json.tool`

Test all projects: `curl -s "http://localhost:3000/api/features?allProjects=true" | python3 -m json.tool`

**Step 5: Commit**

```bash
git add packages/web/src/app/api/features/route.ts
git commit -m "feat: add allProjects query param to GET /api/features"
```

---

### Task 3: Add listAllFeatures to BackendAdapter and RestAdapter

**Files:**
- Modify: `packages/ui/src/lib/backend-adapter.ts`
- Modify: `packages/ui/src/lib/rest-adapter.ts`
- Modify: `packages/ui/src/lib/tauri-adapter.ts`

**Step 1: Add method to BackendAdapter interface**

In `packages/ui/src/lib/backend-adapter.ts`, add to the interface after `listFeatures`:

```typescript
listAllFeatures(filter?: { status?: FeatureStatus }): Promise<Feature[]>;
```

**Step 2: Implement in RestAdapter**

In `packages/ui/src/lib/rest-adapter.ts`, add after the `listFeatures` method:

```typescript
async listAllFeatures(filter?: { status?: FeatureStatus }): Promise<Feature[]> {
  const params = new URLSearchParams();
  params.set('allProjects', 'true');
  if (filter?.status) params.set('status', filter.status);

  const path = `/api/features?${params.toString()}`;
  const res = await fetch(this.url(path), { headers: this.h() });
  return handleResponse<Feature[]>(res);
}
```

**Step 3: Implement stub in TauriAdapter**

In `packages/ui/src/lib/tauri-adapter.ts`, add after the `listFeatures` method:

```typescript
async listAllFeatures(filter?: { status?: FeatureStatus }): Promise<Feature[]> {
  // For now, fall back to listing features from the active project only.
  // A Tauri command for multi-project listing can be added later.
  return this.listFeatures(filter);
}
```

**Step 4: Verify no type errors**

Run: `cd packages/ui && npx tsc --noEmit`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/ui/src/lib/backend-adapter.ts packages/ui/src/lib/rest-adapter.ts packages/ui/src/lib/tauri-adapter.ts
git commit -m "feat: add listAllFeatures to BackendAdapter"
```

---

### Task 4: Add viewMode and groupBy to feature store

**Files:**
- Modify: `packages/ui/src/stores/feature-store.ts`

**Step 1: Extend the store state interface**

Add these fields to `FeatureStoreState`:

```typescript
// View state
viewMode: 'list' | 'board';
groupBy: 'status' | 'project';

// Actions
setViewMode: (mode: 'list' | 'board') => void;
setGroupBy: (g: 'status' | 'project') => void;
loadAllFeatures: (adapter: BackendAdapter) => Promise<void>;
```

**Step 2: Add initial state and action implementations**

In the `create` call, add:

```typescript
viewMode: (typeof window !== 'undefined'
  ? (localStorage.getItem('spec-intelligence:viewMode') as 'list' | 'board') ?? 'list'
  : 'list') as 'list' | 'board',
groupBy: 'status' as 'status' | 'project',

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
```

**Step 3: Add projectName to search filter**

In `filteredFeatures`, extend the search filter to also match `projectName`:

```typescript
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
```

**Step 4: Verify no type errors**

Run: `cd packages/ui && npx tsc --noEmit`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/ui/src/stores/feature-store.ts
git commit -m "feat: add viewMode, groupBy and loadAllFeatures to feature store"
```

---

### Task 5: Create BoardView component

**Files:**
- Create: `packages/ui/src/components/features/BoardView.tsx`
- Modify: `packages/ui/src/index.ts`

**Step 1: Create the BoardView component**

Create `packages/ui/src/components/features/BoardView.tsx`:

```tsx
import type { Feature, FeatureStatus } from '../../types';

const STATUS_COLUMNS: { status: FeatureStatus; label: string; color: string }[] = [
  { status: 'Draft', label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  { status: 'Clarifying', label: 'Clarifying', color: 'bg-amber-100 text-amber-700' },
  { status: 'Planned', label: 'Planned', color: 'bg-blue-100 text-blue-700' },
  { status: 'InProgress', label: 'In Progress', color: 'bg-purple-100 text-purple-700' },
  { status: 'Complete', label: 'Complete', color: 'bg-green-100 text-green-700' },
];

function BoardCard({
  feature,
  showProject,
  onClick,
}: {
  feature: Feature;
  showProject: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-lg border border-gray-6 bg-white p-3 text-left shadow-sm transition-colors hover:border-accent-8 hover:shadow-md"
    >
      <div className="text-sm font-medium text-gray-12">{feature.shortName}</div>
      <div className="mt-0.5 text-xs text-gray-9">{feature.slug}</div>
      {showProject && feature.projectName && (
        <div className="mt-1.5">
          <span className="inline-flex items-center rounded-full bg-accent-3 px-2 py-0.5 text-xs font-medium text-accent-11">
            {feature.projectName}
          </span>
        </div>
      )}
    </button>
  );
}

export function BoardView({
  features,
  groupBy,
  onFeatureClick,
}: {
  features: Feature[];
  groupBy: 'status' | 'project';
  onFeatureClick: (feature: Feature) => void;
}) {
  if (groupBy === 'status') {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUS_COLUMNS.map((col) => {
          const items = features.filter((f) => f.status === col.status);
          return (
            <div key={col.status} className="flex w-64 shrink-0 flex-col">
              <div className="mb-3 flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${col.color}`}>
                  {col.label}
                </span>
                <span className="text-xs text-gray-9">{items.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {items.map((f) => (
                  <BoardCard
                    key={`${f.projectId ?? 'default'}-${f.slug}`}
                    feature={f}
                    showProject={true}
                    onClick={() => onFeatureClick(f)}
                  />
                ))}
                {items.length === 0 && (
                  <div className="rounded-lg border border-dashed border-gray-6 py-8 text-center text-xs text-gray-8">
                    No features
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Group by project
  const projectMap = new Map<string, { name: string; features: Feature[] }>();
  for (const f of features) {
    const key = f.projectId ?? 'unknown';
    const name = f.projectName ?? 'Unknown Project';
    if (!projectMap.has(key)) {
      projectMap.set(key, { name, features: [] });
    }
    projectMap.get(key)!.features.push(f);
  }

  const projects = Array.from(projectMap.entries());

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {projects.map(([id, { name, features: items }]) => (
        <div key={id} className="flex w-64 shrink-0 flex-col">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-full bg-accent-3 px-2.5 py-0.5 text-xs font-semibold text-accent-11">
              {name}
            </span>
            <span className="text-xs text-gray-9">{items.length}</span>
          </div>
          <div className="flex flex-col gap-2">
            {items.map((f) => (
              <BoardCard
                key={f.slug}
                feature={f}
                showProject={false}
                onClick={() => onFeatureClick(f)}
              />
            ))}
          </div>
        </div>
      ))}
      {projects.length === 0 && (
        <div className="w-full rounded-lg border border-dashed border-gray-6 py-12 text-center text-sm text-gray-8">
          No features found across projects
        </div>
      )}
    </div>
  );
}
```

**Step 2: Export from index.ts**

In `packages/ui/src/index.ts`, add:

```typescript
export { BoardView } from './components/features/BoardView';
```

**Step 3: Verify no type errors**

Run: `cd packages/ui && npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/ui/src/components/features/BoardView.tsx packages/ui/src/index.ts
git commit -m "feat: add BoardView kanban component"
```

---

### Task 6: Add view toggle and board to Features page

**Files:**
- Modify: `packages/web/src/app/(dashboard)/features/page.tsx`

**Step 1: Update imports**

Add `BoardView` to the imports from `@spec-intelligence/ui`:

```typescript
import {
  useFeatureStore,
  useBackend,
  SearchInput,
  EmptyState,
  LoadingSpinner,
  ErrorBoundary,
  FeatureCard,
  StatusBadge,
  BoardView,
} from "@spec-intelligence/ui";
```

**Step 2: Add view state to FeatureListContent**

After the existing `const [creating, setCreating] = useState(false);` line, destructure the new store fields:

```typescript
const {
  loading,
  error,
  searchQuery,
  statusFilter,
  sortBy,
  viewMode,
  groupBy,
  loadFeatures,
  loadAllFeatures,
  setSearchQuery,
  setStatusFilter,
  setSortBy,
  setViewMode,
  setGroupBy,
  filteredFeatures,
  createFeature,
} = useFeatureStore();
```

**Step 3: Update the useEffect to load based on viewMode**

Replace the existing `useEffect` that calls `loadFeatures`:

```typescript
useEffect(() => {
  if (viewMode === 'board') {
    loadAllFeatures(backend);
  } else {
    loadFeatures(backend);
  }
}, [backend, viewMode, loadFeatures, loadAllFeatures]);
```

**Step 4: Add ViewToggle component**

Add this component inside the file, before `FeatureListContent`:

```tsx
function ViewToggle({
  viewMode,
  onToggle,
}: {
  viewMode: 'list' | 'board';
  onToggle: (mode: 'list' | 'board') => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg bg-gray-2 p-1">
      <button
        onClick={() => onToggle('list')}
        className={`rounded-md p-1.5 transition-colors ${
          viewMode === 'list'
            ? 'bg-white text-gray-12 shadow-sm'
            : 'text-gray-9 hover:text-gray-11'
        }`}
        title="List view"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
      </button>
      <button
        onClick={() => onToggle('board')}
        className={`rounded-md p-1.5 transition-colors ${
          viewMode === 'board'
            ? 'bg-white text-gray-12 shadow-sm'
            : 'text-gray-9 hover:text-gray-11'
        }`}
        title="Board view"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      </button>
    </div>
  );
}
```

**Step 5: Add view toggle and groupBy toggle to the header**

In the header area, after the "+ New Feature" button, add the ViewToggle. Replace the header div:

```tsx
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-2xl font-bold text-gray-12">Features</h1>
    <p className="mt-1 text-sm text-gray-9">
      Manage your project specifications and feature pipeline.
    </p>
  </div>
  <div className="flex items-center gap-3">
    <ViewToggle viewMode={viewMode} onToggle={setViewMode} />
    <button
      onClick={() => setDialogOpen(true)}
      className="spec-button-primary"
    >
      + New Feature
    </button>
  </div>
</div>
```

**Step 6: Add groupBy toggle when in board mode**

After the filters section, add:

```tsx
{viewMode === 'board' && (
  <div className="mt-4 flex gap-1 rounded-lg bg-gray-2 p-1 self-start">
    <button
      onClick={() => setGroupBy('status')}
      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
        groupBy === 'status'
          ? 'bg-white text-gray-12 shadow-sm'
          : 'text-gray-9 hover:text-gray-11'
      }`}
    >
      By Status
    </button>
    <button
      onClick={() => setGroupBy('project')}
      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
        groupBy === 'project'
          ? 'bg-white text-gray-12 shadow-sm'
          : 'text-gray-9 hover:text-gray-11'
      }`}
    >
      By Project
    </button>
  </div>
)}
```

**Step 7: Conditionally render board or grid**

Replace the existing feature grid section (`{!loading && features.length > 0 && (...)}`):

```tsx
{!loading && features.length > 0 && (
  <div className="mt-6">
    {viewMode === 'board' ? (
      <BoardView
        features={features}
        groupBy={groupBy}
        onFeatureClick={(f) => router.push(`/features/${f.slug}`)}
      />
    ) : (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <FeatureCard
            key={feature.slug}
            feature={feature}
            onClick={() => router.push(`/features/${feature.slug}/spec`)}
          />
        ))}
      </div>
    )}
  </div>
)}
```

**Step 8: Verify it compiles and renders**

Run: `cd packages/web && npx next dev --port 3000`
Open: `http://localhost:3000/features`
Expected: View toggle visible, clicking Board shows kanban columns

**Step 9: Commit**

```bash
git add packages/web/src/app/(dashboard)/features/page.tsx
git commit -m "feat: add board view toggle to features page"
```

---

### Task 7: Export new store fields from UI package

**Files:**
- Modify: `packages/ui/src/index.ts`

**Step 1: Verify exports**

Check that `FeatureStoreState` in the existing export includes the new fields. The type is already exported via:

```typescript
export { useFeatureStore } from './stores/feature-store';
export type { FeatureStoreState } from './stores/feature-store';
```

No changes needed if `BoardView` was already added in Task 5. Verify:

Run: `cd packages/ui && npx tsc --noEmit`
Expected: PASS

**Step 2: Commit (if any changes)**

```bash
git add packages/ui/src/index.ts
git commit -m "chore: verify UI package exports for board view"
```

---

### Task 8: Integration test — full flow

**Files:**
- None (manual testing)

**Step 1: Start the dev server**

Run: `make dev` or `cd packages/web && npx next dev --port 3000`

**Step 2: Register at least 2 projects**

1. Open `http://localhost:3000`
2. Enter a path to a project with `specs/` folder, click Open
3. Go back to `/`, open a second project

**Step 3: Test board view**

1. Navigate to `/features`
2. Click the Board toggle (right icon)
3. Verify: Features from ALL registered projects appear in status columns
4. Verify: Each card shows a project badge
5. Toggle "By Project" — columns should switch to project names
6. Click a card — should navigate to `/features/{slug}`

**Step 4: Test list view**

1. Click the List toggle (left icon)
2. Verify: Only features from the ACTIVE project are shown (like before)

**Step 5: Test persistence**

1. Switch to Board view
2. Refresh the page
3. Verify: Board view is still selected (persisted in localStorage)

**Step 6: Test filters**

1. In Board view, use the search box to filter by project name
2. Use status filter tabs — columns should filter accordingly
