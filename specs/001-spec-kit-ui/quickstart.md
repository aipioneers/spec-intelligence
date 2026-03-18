# Quickstart Validation: Spec-Kit UI

**Branch**: `001-spec-kit-ui` | **Date**: 2026-03-17

## Purpose

This document defines the minimum validation scenarios to confirm core functionality works end-to-end before expanding to full feature coverage.

## Scenario 1: Create and View a Feature (P1 — US1)

**Goal**: Verify the core spec creation loop works.

1. Open the application (desktop or web)
2. Click "New Feature" on the dashboard
3. Enter description: "Add user authentication with email and password"
4. Verify:
   - A new feature appears in the list with status "Draft"
   - The spec editor opens with pre-populated user stories and requirements
   - The spec.md file exists on disk at `specs/002-user-auth/spec.md`
   - The git branch `002-user-auth` is created (if git is available)
5. Edit a requirement text and save
6. Verify the change persists in the spec.md file

**Pass criteria**: Feature creation completes in under 2 minutes (SC-001). File on disk matches UI content.

## Scenario 2: Pipeline Navigation (P1 — US2)

**Goal**: Verify the workflow pipeline visualization reflects artifact state.

1. Open the feature created in Scenario 1
2. Verify the pipeline shows: Specify (complete) → Clarify (available) → Plan (blocked) → Tasks (blocked) → Implement (blocked)
3. Click on the "Specify" phase
4. Verify the spec editor opens
5. Verify blocked phases show a tooltip explaining the prerequisite

**Pass criteria**: User identifies current phase and next action within 5 seconds (SC-002).

## Scenario 3: Plan and Task Generation (P1 — US3)

**Goal**: Verify plan-to-task flow and kanban board.

1. Open a feature with a completed spec (no [NEEDS CLARIFICATION] markers)
2. Click "Generate Plan" in the pipeline
3. Verify plan.md is created and displayed with sections
4. Click "Generate Tasks" in the pipeline
5. Verify tasks appear on the kanban board grouped by phase
6. Drag a task from "Todo" to "In Progress"
7. Verify tasks.md on disk reflects the status change

**Pass criteria**: Drag-and-drop reflects in file within 1 second (SC-004).

## Scenario 4: File Watching (Cross-cutting)

**Goal**: Verify external file changes are detected and reflected in the UI.

1. Open the application with a feature displayed
2. Using an external editor (e.g., VS Code), modify the spec.md file directly
3. Verify the UI shows a notification that the file has changed
4. Verify the spec editor updates to show the new content

**Pass criteria**: Change notification appears within 2 seconds of file save.

## Scenario 5: Search and Navigation (P1 — US1)

**Goal**: Verify dashboard-to-edit navigation efficiency.

1. Create 3+ features with different names and statuses
2. From the dashboard, use the search bar to find a specific feature
3. Click the feature to open it
4. Click a specific requirement to edit it

**Pass criteria**: Dashboard to editing a requirement in 3 clicks or fewer (SC-003).

## Scenario 6: Clarification Resolution (P2 — US4)

**Goal**: Verify the clarification dialog workflow.

1. Open a spec that contains [NEEDS CLARIFICATION: ...] markers
2. Click on a highlighted marker
3. Verify the dialog shows the question, context, and options
4. Select an option and confirm
5. Verify the marker is replaced with the answer in both the editor and the file
6. Verify a clarification history entry is created

**Pass criteria**: Marker resolved and file updated in a single interaction.

## Scenario 7: CLI Compatibility (Cross-cutting)

**Goal**: Verify files created via UI are CLI-compatible.

1. Create a feature and complete the spec via the UI
2. In a terminal, run the spec-kit CLI commands on the same project:
   - `cat specs/001-spec-kit-ui/spec.md` — verify valid markdown
   - Run any spec-kit CLI validation on the file
3. Conversely, create a feature via CLI and verify it appears in the UI

**Pass criteria**: 100% bidirectional compatibility (SC-006).

## Smoke Test Order

Run scenarios in this order for fastest validation:

1. Scenario 1 (Create) — tests core CRUD
2. Scenario 5 (Search) — tests navigation
3. Scenario 2 (Pipeline) — tests status derivation
4. Scenario 4 (File Watch) — tests real-time sync
5. Scenario 3 (Plan/Tasks) — tests generation + kanban
6. Scenario 6 (Clarification) — tests interactive workflow
7. Scenario 7 (CLI Compat) — tests file format fidelity
