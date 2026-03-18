# Board View: Cross-Project Feature Overview

## Goal

Add a board view to the Features page that shows features from all registered projects in a single Kanban-style overview, togglable with the existing list view.

## Architecture

The Features page gets a view toggle (List | Board). In Board mode, features from all projects are fetched via a new `?allProjects=true` query parameter on the existing `GET /api/features` endpoint. No new routes or pages needed.

## Data Model Changes

Two optional fields added to the `Feature` type:

```typescript
projectId?: string;    // UUID from projects.json
projectName?: string;  // Display name of the project
```

These are only populated when `allProjects=true`. Single-project mode remains unchanged.

## API Changes

`GET /api/features?allProjects=true`:

- Reads all projects from `~/.spec-intelligence/projects.json`
- Scans each project's `specs/` directory
- Returns features with `projectId` and `projectName` attached
- Existing filters (status, sort) apply to the combined result
- Without the parameter, behavior is unchanged (single project via `X-Project-Root` header)

## UI Design

### View Toggle

- Located top-right on Features page, next to "+ New Feature" button
- Two icon buttons: List (grid) and Board (kanban)
- View preference persisted in localStorage

### Board View

- 5 columns by default: Draft | Clarifying | Planned | InProgress | Complete
- Feature cards show: name, slug, project badge
- Grouping toggle above the board: "by Status" (default) or "by Project"
  - By Status: columns = statuses, cards show project badge
  - By Project: columns = projects, cards show status badge
- Click on card navigates to `/features/{slug}` (feature detail page with pipeline/tabs)
- No drag-and-drop — status changes happen through the workflow (Specify, Clarify, Plan, Tasks)

### Project Context

- Board mode automatically fetches from all projects
- List mode uses active project only (existing behavior)
- Each card shows a small project badge when multiple projects are visible

### Creating Features in Board Mode

- "+ New Feature" opens the existing dialog
- Feature is created in the active project (shown in sidebar project switcher)

## State Management

`useFeatureStore` additions:

- `viewMode: "list" | "board"` — persisted in localStorage
- `groupBy: "status" | "project"` — board grouping mode
- `loadAllFeatures(backend)` — calls `/api/features?allProjects=true`

Switching List → Board triggers `loadAllFeatures`. Switching Board → List triggers `loadFeatures` with active project. Existing filters (search, status, sort) apply to both views.

## Navigation

No sidebar changes. The view toggle lives on the Features page. The project switcher in the sidebar continues to show the active project. In Board mode it indicates where new features will be created.

## Tech Stack

- Existing: React 18, Zustand, Tailwind CSS, Next.js 14
- No new dependencies needed
