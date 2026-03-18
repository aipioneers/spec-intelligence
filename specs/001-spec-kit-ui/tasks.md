# Tasks: Spec-Kit UI

**Input**: Design documents from `/specs/001-spec-kit-ui/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Monorepo**: `packages/ui/`, `packages/web/`, `packages/desktop/`
- Shared components and logic in `packages/ui/src/`
- Next.js app routes in `packages/web/src/app/`
- Tauri backend in `packages/desktop/src-tauri/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, monorepo configuration, and shared tooling

- [ ] T001 Initialize Turborepo monorepo with root package.json, turbo.json, and tsconfig.json at repository root
- [ ] T002 Create packages/ui workspace with package.json, tsconfig.json, and directory structure: src/{components,hooks,stores,lib,types,i18n}
- [ ] T003 [P] Create packages/web workspace with Next.js 14 App Router, package.json, tsconfig.json, and next.config.js at packages/web/
- [ ] T004 [P] Create packages/desktop workspace with Tauri 2 config: packages/desktop/src-tauri/Cargo.toml, packages/desktop/src-tauri/tauri.conf.json, and packages/desktop/src-tauri/src/main.rs
- [ ] T005 [P] Configure Tailwind CSS with shared config at packages/ui/tailwind.config.ts, install Radix UI primitives in packages/ui/package.json
- [ ] T006 [P] Configure Vitest at packages/ui/vitest.config.ts and Playwright at packages/web/playwright.config.ts
- [ ] T007 [P] Set up next-intl with English locale file at packages/ui/src/i18n/messages/en.json and German at packages/ui/src/i18n/messages/de.json, create i18n provider at packages/ui/src/i18n/index.ts
- [ ] T008 [P] Install and configure unified/remark with remark-gfm, remark-frontmatter plugins in packages/ui/package.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [ ] T009 Define shared TypeScript types for all entities (Feature, Specification, UserStory, AcceptanceScenario, Requirement, SuccessCriterion, Plan, Task, Constitution, Extension, Preset, AgentConfig, Checklist) in packages/ui/src/types/index.ts per data-model.md
- [ ] T010 [P] Implement spec markdown parser: parse spec.md into Specification type using remark, extracting user stories, requirements, success criteria, clarifications, and assumptions in packages/ui/src/lib/parser/spec-parser.ts
- [ ] T011 [P] Implement spec markdown serializer: convert Specification type back to valid spec.md markdown with roundtrip fidelity in packages/ui/src/lib/parser/spec-serializer.ts
- [ ] T012 [P] Implement plan markdown parser/serializer for plan.md in packages/ui/src/lib/parser/plan-parser.ts
- [ ] T013 [P] Implement tasks markdown parser/serializer for tasks.md (parse task IDs, status checkboxes, phases, dependencies, [P] markers) in packages/ui/src/lib/parser/tasks-parser.ts
- [ ] T014 [P] Implement constitution markdown parser/serializer for constitution.md in packages/ui/src/lib/parser/constitution-parser.ts
- [ ] T015 Implement feature discovery service: scan specs/ directory, derive feature status from artifact presence per data-model status derivation rules in packages/ui/src/lib/features.ts
- [ ] T016 [P] Implement git operations service: create branch, get current branch, check branch existence in packages/ui/src/lib/git/git-service.ts
- [ ] T017 Create Zustand feature store with actions: loadFeatures, createFeature, deleteFeature, updateFeatureStatus in packages/ui/src/stores/feature-store.ts
- [ ] T018 [P] Create Zustand editor store with actions: loadDocument, saveDocument, switchMode (form/markdown/raw) in packages/ui/src/stores/editor-store.ts
- [ ] T019 [P] Create shared UI primitives: StatusBadge, SearchInput, EmptyState, LoadingSpinner, ErrorBoundary components in packages/ui/src/components/common/
- [ ] T020 Implement backend adapter abstraction: define a BackendAdapter interface with methods matching the API contract (listFeatures, getFeature, createFeature, etc.) in packages/ui/src/lib/backend-adapter.ts
- [ ] T021 [P] Implement Tauri IPC backend adapter: connect BackendAdapter to Tauri invoke commands in packages/ui/src/lib/tauri-adapter.ts
- [ ] T022 [P] Implement REST API backend adapter: connect BackendAdapter to fetch calls against /api/* routes in packages/ui/src/lib/rest-adapter.ts
- [ ] T023 Create useBackend hook that auto-detects environment (Tauri window vs browser) and returns the correct adapter in packages/ui/src/hooks/useBackend.ts

**Checkpoint**: Foundation ready - all parsers, stores, and backend abstractions operational. User story implementation can now begin in parallel.

---

## Phase 3: User Story 1 - Specification Authoring & Management (Priority: P1)

**Goal**: Users can create new feature specs from text descriptions, edit them in a hybrid editor, search/filter the feature list, and save changes that persist as spec.md files.

**Independent Test**: Create a spec from description, edit a requirement, save, verify spec list shows it with correct status. Verify spec.md on disk matches.

### Implementation for User Story 1

- [ ] T024 [P] [US1] Implement feature list component with search, sort, and status filter in packages/ui/src/components/dashboard/FeatureList.tsx
- [ ] T025 [P] [US1] Implement feature list item card showing feature number, name, status badge, creation date, and phase progress in packages/ui/src/components/dashboard/FeatureCard.tsx
- [ ] T026 [P] [US1] Implement "New Feature" dialog: text input for description, auto-generated short name preview, create button that calls createFeature in packages/ui/src/components/dashboard/NewFeatureDialog.tsx
- [ ] T027 [US1] Implement create feature backend logic: call create-new-feature.sh, parse JSON output, populate spec from template in packages/web/src/app/api/features/route.ts
- [ ] T028 [P] [US1] Implement Tauri create_feature command: shell out to create-new-feature.sh, return feature data in packages/desktop/src-tauri/src/commands/features.rs
- [ ] T029 [US1] Set up TipTap editor with markdown extension, configure custom UserStory node that renders as a structured form (title, priority dropdown, description textarea, acceptance scenario fields) in packages/ui/src/components/editor/nodes/UserStoryNode.tsx
- [ ] T030 [P] [US1] Create custom TipTap Requirement node: renders as form row with FR-ID input, description field, and [NEEDS CLARIFICATION] highlight in packages/ui/src/components/editor/nodes/RequirementNode.tsx
- [ ] T031 [P] [US1] Create custom TipTap SuccessCriterion node: renders as form row with SC-ID and measurable outcome field in packages/ui/src/components/editor/nodes/SuccessCriterionNode.tsx
- [ ] T032 [US1] Build hybrid SpecEditor component: integrate TipTap with custom nodes, add mode toggle (Form View / Markdown View / Raw View), wire to editor store in packages/ui/src/components/editor/SpecEditor.tsx
- [ ] T033 [US1] Implement save logic: serialize TipTap document back to markdown via spec-serializer, write to file via backend adapter, handle ETag-based conflict detection in packages/ui/src/components/editor/useSaveSpec.ts
- [ ] T034 [US1] Create feature detail page with spec editor, connecting route params to feature loading in packages/web/src/app/(dashboard)/features/[slug]/spec/page.tsx
- [ ] T035 [US1] Create feature list page wiring FeatureList component to feature store and backend adapter in packages/web/src/app/(dashboard)/features/page.tsx
- [ ] T036 [US1] Implement Tauri list_features and get_feature commands: scan specs/ directory, parse spec metadata, return Feature[] in packages/desktop/src-tauri/src/commands/features.rs
- [ ] T037 [US1] Implement Tauri get_spec and update_spec commands: read/write spec.md, parse via pulldown-cmark, return Specification data in packages/desktop/src-tauri/src/commands/specs.rs

**Checkpoint**: User Story 1 fully functional — users can create, list, search, edit, and save specifications.

---

## Phase 4: User Story 2 - Workflow Pipeline Visualization (Priority: P1)

**Goal**: Each feature shows a visual pipeline (Specify → Clarify → Plan → Tasks → Implement) with completion status per phase, blocked indicators, and clickable navigation to artifacts.

**Independent Test**: Open a feature with spec only — verify pipeline shows Specify=complete, Plan=available, Tasks/Implement=blocked. Click Specify to open editor.

### Implementation for User Story 2

- [ ] T038 [P] [US2] Implement PipelinePhase component: circular step indicator with status icon (not-started/in-progress/complete/blocked), label, and click handler in packages/ui/src/components/pipeline/PipelinePhase.tsx
- [ ] T039 [P] [US2] Implement PipelineConnector component: arrow/line between phases with animated flow direction in packages/ui/src/components/pipeline/PipelineConnector.tsx
- [ ] T040 [US2] Implement Pipeline component: compose PipelinePhase + PipelineConnector into horizontal workflow bar, derive phase statuses from feature artifact presence (spec exists → Specify complete, plan exists → Plan complete, etc.) in packages/ui/src/components/pipeline/Pipeline.tsx
- [ ] T041 [US2] Implement phase click navigation: clicking a completed/available phase navigates to the corresponding editor (spec/plan/tasks), blocked phases show tooltip explaining prerequisite in packages/ui/src/components/pipeline/usePipelineNavigation.ts
- [ ] T042 [US2] Create feature detail page that shows Pipeline at top and selected artifact editor below, routing between spec/plan/tasks sub-views in packages/web/src/app/(dashboard)/features/[slug]/page.tsx

**Checkpoint**: User Story 2 fully functional — pipeline visualization guides users through the SDD workflow.

---

## Phase 5: User Story 3 - Implementation Planning & Task Management (Priority: P1)

**Goal**: Users can generate plans from specs, view/edit plans, generate tasks from plans, and manage tasks on a kanban board with drag-and-drop status updates that persist to tasks.md.

**Independent Test**: Open a feature with a spec, generate plan, verify plan.md created. Generate tasks, verify kanban board shows tasks grouped by phase. Drag a task, verify tasks.md updates.

### Implementation for User Story 3

- [ ] T043 [P] [US3] Implement PlanEditor component: structured sections for summary, technical context, project structure, and complexity tracking, with markdown editing per section in packages/ui/src/components/editor/PlanEditor.tsx
- [ ] T044 [P] [US3] Implement plan generation trigger button that validates spec prerequisites (no NEEDS CLARIFICATION markers) and calls backend generatePlan in packages/ui/src/components/pipeline/GeneratePlanButton.tsx
- [ ] T045 [US3] Implement plan generation API route: invoke speckit plan workflow, write plan.md in packages/web/src/app/api/features/[slug]/plan/route.ts
- [ ] T046 [P] [US3] Implement Tauri generate_plan and get_plan commands in packages/desktop/src-tauri/src/commands/plans.rs
- [ ] T047 [US3] Create Zustand kanban store with actions: loadTasks, updateTaskStatus, reorderTask, computeDependencyAvailability in packages/ui/src/stores/kanban-store.ts
- [ ] T048 [P] [US3] Implement KanbanColumn component: phase header, droppable zone via dnd-kit useDroppable, task card list in packages/ui/src/components/kanban/KanbanColumn.tsx
- [ ] T049 [P] [US3] Implement TaskCard component: draggable via dnd-kit useDraggable, shows task ID, description, priority badge, [P] marker, dependency indicators, and story label in packages/ui/src/components/kanban/TaskCard.tsx
- [ ] T050 [US3] Implement KanbanBoard component: compose columns per phase (Setup/Foundation/UserStory/Polish), configure DndContext with custom collision detection that prevents dropping blocked tasks, handle onDragEnd to update status in packages/ui/src/components/kanban/KanbanBoard.tsx
- [ ] T051 [US3] Implement dependency visualization: draw SVG arrows between dependent tasks on the board, highlight blocked tasks in red, show dependency tooltip on hover in packages/ui/src/components/kanban/DependencyOverlay.tsx
- [ ] T052 [US3] Wire kanban board to backend: on drag-end, call updateTaskStatus via backend adapter, persist status change to tasks.md within 1 second in packages/ui/src/components/kanban/useKanbanSync.ts
- [ ] T053 [US3] Implement task generation trigger button and API route: invoke speckit tasks workflow, write tasks.md in packages/web/src/app/api/features/[slug]/tasks/route.ts
- [ ] T054 [P] [US3] Implement Tauri generate_tasks, list_tasks, and update_task_status commands in packages/desktop/src-tauri/src/commands/tasks.rs
- [ ] T055 [US3] Create plan view page in packages/web/src/app/(dashboard)/features/[slug]/plan/page.tsx
- [ ] T056 [US3] Create tasks/kanban view page in packages/web/src/app/(dashboard)/features/[slug]/tasks/page.tsx

**Checkpoint**: User Story 3 fully functional — full plan-to-tasks-to-kanban flow with drag-and-drop persistence.

---

## Phase 6: User Story 4 - Clarification Workflow (Priority: P2)

**Goal**: Users see highlighted [NEEDS CLARIFICATION] markers in the spec editor, click them to open a resolution dialog with options, resolve them, and see the spec update with a clarification history log.

**Independent Test**: Open a spec with NEEDS CLARIFICATION markers, click a marker, select an option, verify marker replaced in editor and file, verify clarification history section updated.

### Implementation for User Story 4

- [ ] T057 [P] [US4] Implement ClarificationMarker TipTap decoration: highlight [NEEDS CLARIFICATION: ...] text with yellow background and clickable icon in packages/ui/src/components/editor/nodes/ClarificationMarker.tsx
- [ ] T058 [P] [US4] Implement ClarificationDialog component: shows question context, option table with implications, custom answer input, and confirm button in packages/ui/src/components/clarification/ClarificationDialog.tsx
- [ ] T059 [US4] Implement ClarificationHistory component: list of resolved clarifications grouped by session date (Q → A format) in packages/ui/src/components/clarification/ClarificationHistory.tsx
- [ ] T060 [US4] Implement resolve clarification logic: replace marker text in TipTap document, add entry to Clarifications section, serialize and save spec via backend adapter in packages/ui/src/components/clarification/useClarificationResolve.ts
- [ ] T061 [P] [US4] Implement clarification API routes: GET markers, POST resolve in packages/web/src/app/api/features/[slug]/clarifications/route.ts
- [ ] T062 [P] [US4] Implement Tauri get_clarification_markers and resolve_clarification commands in packages/desktop/src-tauri/src/commands/specs.rs

**Checkpoint**: User Story 4 fully functional — clarification markers are interactive and resolvable.

---

## Phase 7: User Story 5 - Project Dashboard & Constitution (Priority: P2)

**Goal**: Dashboard shows project-wide feature overview (counts by status, recent activity, feature list) and constitution summary. Users can view and edit the constitution.

**Independent Test**: Navigate to dashboard with multiple features, verify correct status counts. Edit constitution, verify constitution.md persists changes.

### Implementation for User Story 5

- [ ] T063 [P] [US5] Implement DashboardStats component: feature count cards (Total, Draft, In Progress, Complete) with icons in packages/ui/src/components/dashboard/DashboardStats.tsx
- [ ] T064 [P] [US5] Implement RecentActivity component: list of recent feature changes derived from file modification timestamps in packages/ui/src/components/dashboard/RecentActivity.tsx
- [ ] T065 [P] [US5] Implement ConstitutionSummary component: display core principles as collapsible cards in packages/ui/src/components/constitution/ConstitutionSummary.tsx
- [ ] T066 [US5] Implement ConstitutionEditor component: editable sections for principles, constraints, and development guidelines using TipTap markdown editor in packages/ui/src/components/constitution/ConstitutionEditor.tsx
- [ ] T067 [US5] Create dashboard home page composing DashboardStats + RecentActivity + ConstitutionSummary + FeatureList in packages/web/src/app/(dashboard)/page.tsx
- [ ] T068 [US5] Create constitution settings page with ConstitutionEditor in packages/web/src/app/settings/constitution/page.tsx
- [ ] T069 [P] [US5] Implement constitution API routes: GET and PUT in packages/web/src/app/api/constitution/route.ts
- [ ] T070 [P] [US5] Implement Tauri get_constitution and update_constitution commands in packages/desktop/src-tauri/src/commands/constitution.rs

**Checkpoint**: User Story 5 fully functional — dashboard provides project-level awareness with constitution governance.

---

## Phase 8: User Story 6 - Extension & Preset Management (Priority: P2)

**Goal**: Users can browse, search, install, and remove extensions from catalogs. Same for presets with template preview.

**Independent Test**: Open Extensions panel, search for keyword, install an extension, verify it appears in installed list, remove it.

### Implementation for User Story 6

- [ ] T071 [P] [US6] Implement ExtensionCard component: name, description, version, install/remove button, status badge in packages/ui/src/components/extensions/ExtensionCard.tsx
- [ ] T072 [P] [US6] Implement ExtensionBrowser component: search bar, catalog source filter, grid of ExtensionCards with installed/available tabs in packages/ui/src/components/extensions/ExtensionBrowser.tsx
- [ ] T073 [P] [US6] Implement PresetCard component: name, description, template preview list, install/activate button in packages/ui/src/components/extensions/PresetCard.tsx
- [ ] T074 [US6] Implement PresetBrowser component: search, preview dialog showing template contents, install/remove actions in packages/ui/src/components/extensions/PresetBrowser.tsx
- [ ] T075 [US6] Implement extension/preset service: read .specify/extension-catalogs.yml, fetch catalog data via HTTPS with offline cache fallback, install/remove via specify CLI in packages/ui/src/lib/extensions.ts
- [ ] T076 [US6] Create extensions settings page in packages/web/src/app/settings/extensions/page.tsx
- [ ] T077 [US6] Create presets settings page in packages/web/src/app/settings/presets/page.tsx
- [ ] T078 [P] [US6] Implement extension/preset API routes in packages/web/src/app/api/extensions/route.ts and packages/web/src/app/api/presets/route.ts
- [ ] T079 [P] [US6] Implement Tauri extension and preset commands in packages/desktop/src-tauri/src/commands/extensions.rs

**Checkpoint**: User Story 6 fully functional — extensions and presets can be browsed, installed, and removed.

---

## Phase 9: User Story 7 - GitHub Integration & Issue Sync (Priority: P3)

**Goal**: Users can export tasks to GitHub issues with preview, label mapping, and bidirectional linking.

**Independent Test**: With tasks on the board, click "Export to GitHub Issues", verify preview shows correct mapping, confirm export, verify issues created in GitHub and tasks.md updated with links.

### Implementation for User Story 7

- [ ] T080 [P] [US7] Implement GitHub client service: authenticate via GH_TOKEN, create issues, add labels, link to spec using Octokit in packages/ui/src/lib/github.ts (shared) and packages/web/src/lib/github.ts (server-side)
- [ ] T081 [P] [US7] Implement IssuePreview component: table showing task → issue mapping with title, body preview, suggested labels, and select checkboxes in packages/ui/src/components/github/IssuePreview.tsx
- [ ] T082 [US7] Implement ExportToGitHubDialog component: repository selector, task selection, preview table, confirm button, progress indicator in packages/ui/src/components/github/ExportToGitHubDialog.tsx
- [ ] T083 [US7] Implement issue export logic: map selected tasks to GitHub issue payloads, batch-create issues, update tasks.md with issue URLs in packages/ui/src/components/github/useIssueExport.ts
- [ ] T084 [P] [US7] Implement GitHub API routes: preview and export in packages/web/src/app/api/features/[slug]/github/route.ts
- [ ] T085 [P] [US7] Implement Tauri github commands: preview_issue_export and export_to_github using reqwest in packages/desktop/src-tauri/src/commands/github.rs

**Checkpoint**: User Story 7 fully functional — tasks can be exported as GitHub issues with traceability.

---

## Phase 10: User Story 8 - Multi-Agent Configuration (Priority: P3)

**Goal**: Users can view configured AI agents, add/remove agent support, and sync agent context files.

**Independent Test**: Add Cursor support, verify .cursor/ directory created. Trigger sync, verify agent context files updated with current spec data.

### Implementation for User Story 8

- [ ] T086 [P] [US8] Implement AgentCard component: agent icon, name, directory path, sync status badge (up-to-date/stale/not-initialized), sync and remove buttons in packages/ui/src/components/agents/AgentCard.tsx
- [ ] T087 [US8] Implement AgentConfigPanel component: grid of AgentCards for installed agents, "Add Agent" dropdown with all 20+ supported agents, sync-all button in packages/ui/src/components/agents/AgentConfigPanel.tsx
- [ ] T088 [US8] Implement agent sync service: invoke update-agent-context.sh for specified agent type, compare file timestamps to determine sync status in packages/ui/src/lib/agents.ts
- [ ] T089 [US8] Create agents settings page in packages/web/src/app/settings/agents/page.tsx
- [ ] T090 [P] [US8] Implement agent API routes: list, add, remove, sync in packages/web/src/app/api/agents/route.ts
- [ ] T091 [P] [US8] Implement Tauri agent commands: list_agents, add_agent, remove_agent, sync_agent_context in packages/desktop/src-tauri/src/commands/agents.rs

**Checkpoint**: User Story 8 fully functional — multiple AI agents can be configured and synced.

---

## Phase 11: User Story 9 - Cross-Artifact Analysis & Consistency (Priority: P3)

**Goal**: Users run analysis that checks consistency across spec, plan, tasks, and constitution. Results show orphaned requirements, missing coverage, and violations with links.

**Independent Test**: Create a spec with FR-001 to FR-005, tasks referencing only FR-001 to FR-003. Run analysis, verify FR-004 and FR-005 flagged as uncovered.

### Implementation for User Story 9

- [ ] T092 [P] [US9] Implement analysis engine: requirement coverage checker (scan tasks for FR-XXX references, flag orphaned requirements) in packages/ui/src/lib/analysis/requirement-coverage.ts
- [ ] T093 [P] [US9] Implement analysis engine: constitution violation checker (compare plan decisions against constitution constraints) in packages/ui/src/lib/analysis/constitution-checker.ts
- [ ] T094 [P] [US9] Implement analysis engine: cross-artifact consistency checker (verify entities in data-model match spec entities, plan references match spec) in packages/ui/src/lib/analysis/consistency-checker.ts
- [ ] T095 [US9] Implement analysis orchestrator: run all checkers, aggregate AnalysisIssue[] results, generate AnalysisSummary in packages/ui/src/lib/analysis/analyzer.ts
- [ ] T096 [P] [US9] Implement AnalysisReport component: grouped issues by severity (error/warning/info), clickable links to affected spec sections, summary stats in packages/ui/src/components/analysis/AnalysisReport.tsx
- [ ] T097 [US9] Create analysis page with "Run Analysis" button and AnalysisReport display in packages/web/src/app/analysis/page.tsx
- [ ] T098 [P] [US9] Implement analysis API route in packages/web/src/app/api/analysis/route.ts
- [ ] T099 [P] [US9] Implement Tauri run_analysis command in packages/desktop/src-tauri/src/commands/analysis.rs

**Checkpoint**: User Story 9 fully functional — cross-artifact analysis detects inconsistencies and reports them.

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: File watching, authentication, app shell, and deployment readiness

- [ ] T100 [P] Implement useFileWatcher hook: abstract over Tauri fs events and SSE for web, debounce 300ms, emit FileChangeEvent with featureSlug and artifact type in packages/ui/src/hooks/useFileWatcher.ts
- [ ] T101 [P] Implement Tauri file watcher: watch specs/ directory recursively using notify crate, emit fs-change events to frontend in packages/desktop/src-tauri/src/watcher.rs
- [ ] T102 [P] Implement SSE file watcher endpoint: watch specs/ via chokidar, stream events to connected clients in packages/web/src/app/api/events/route.ts
- [ ] T103 Integrate file watcher with feature store: on file change event, refresh affected feature data and show notification toast in packages/ui/src/hooks/useFileWatcherIntegration.ts
- [ ] T104 [P] Implement Better Auth configuration: email/password provider, role-based access (viewer/editor/admin), session management in packages/web/src/lib/auth.ts
- [ ] T105 [P] Implement auth middleware: protect all /api/* routes, enforce role-based permissions per API contract in packages/web/src/middleware.ts
- [ ] T106 [P] Implement login page with email/password form in packages/web/src/app/auth/login/page.tsx
- [ ] T107 Implement app shell layout: sidebar navigation (Dashboard, Features, Settings, Analysis), top bar with search and user menu, responsive design in packages/web/src/app/(dashboard)/layout.tsx
- [ ] T108 [P] Implement desktop app shell: same sidebar/topbar layout without auth elements, Tauri window chrome configuration in packages/desktop/src/app/layout.tsx
- [ ] T109 [P] Implement checklist generation and tracking: parse checklist template, render as interactive checkbox list, persist to checklists/ directory in packages/ui/src/components/common/ChecklistViewer.tsx
- [ ] T110 [P] Implement concurrent edit protection for self-hosted mode: ETag-based optimistic locking on all write endpoints, conflict diff view component in packages/ui/src/components/common/ConflictResolver.tsx
- [ ] T111 Run quickstart.md validation scenarios (7 scenarios) end-to-end against both desktop and web modes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-11)**: All depend on Foundational phase completion
  - US1 (Phase 3), US2 (Phase 4), US3 (Phase 5) are all P1 and can proceed in parallel
  - US4 (Phase 6), US5 (Phase 7), US6 (Phase 8) are P2 and can proceed in parallel after foundation
  - US7 (Phase 9), US8 (Phase 10), US9 (Phase 11) are P3 and can proceed in parallel after foundation
- **Polish (Phase 12)**: File watching and auth can start after foundation; app shell after at least US1+US2 complete

### User Story Dependencies

- **US1 (Spec Authoring)**: No dependencies on other stories - standalone
- **US2 (Pipeline)**: Logically follows US1 (needs feature detail view) but can be built independently using the feature store
- **US3 (Planning & Tasks)**: No dependencies on US1/US2 — separate editor and board views
- **US4 (Clarification)**: Extends US1's spec editor with marker detection — can be built as editor plugin independently
- **US5 (Dashboard)**: Uses feature store from US1 — can be built independently since store is in foundation
- **US6 (Extensions)**: Fully independent — settings panel with no spec/plan dependencies
- **US7 (GitHub)**: Uses task data from US3's kanban store — but can be built independently with mock data
- **US8 (Agents)**: Fully independent — settings panel invoking shell scripts
- **US9 (Analysis)**: Uses parsers from foundation — fully independent

### Within Each User Story

- Backend adapters (API routes + Tauri commands) before UI components that call them
- Shared components before page compositions
- Core implementation before integration touches

### Parallel Opportunities

- All [P] tasks within a phase can run in parallel
- Once foundation completes, ALL 9 user stories can start in parallel (if team capacity allows)
- Within each story, Tauri commands and API routes can be built in parallel
- Polish phase tasks marked [P] are independent

---

## Parallel Example: User Story 1

```bash
# Launch parallel foundational tasks:
Task: "Implement spec markdown parser in packages/ui/src/lib/parser/spec-parser.ts"
Task: "Implement spec markdown serializer in packages/ui/src/lib/parser/spec-serializer.ts"
Task: "Implement plan markdown parser in packages/ui/src/lib/parser/plan-parser.ts"
Task: "Implement tasks markdown parser in packages/ui/src/lib/parser/tasks-parser.ts"

# Then launch parallel US1 components:
Task: "Implement FeatureList component in packages/ui/src/components/dashboard/FeatureList.tsx"
Task: "Implement FeatureCard component in packages/ui/src/components/dashboard/FeatureCard.tsx"
Task: "Implement NewFeatureDialog in packages/ui/src/components/dashboard/NewFeatureDialog.tsx"
Task: "Implement Tauri create_feature command in packages/desktop/src-tauri/src/commands/features.rs"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T008)
2. Complete Phase 2: Foundational (T009-T023)
3. Complete Phase 3: User Story 1 (T024-T037)
4. **STOP and VALIDATE**: Test spec creation, editing, saving, and listing independently
5. Deploy/demo if ready — users can already create and manage specifications

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 (Spec Authoring) → MVP: create and edit specs
3. Add US2 (Pipeline) → Visual workflow guidance
4. Add US3 (Planning & Tasks) → Full plan-to-kanban flow
5. Add US4 (Clarification) → Resolve ambiguities in specs
6. Add US5 (Dashboard) → Project overview
7. Add US6 (Extensions) → Customize workflows
8. Add US7 (GitHub) → Issue sync
9. Add US8 (Agents) → Multi-agent support
10. Add US9 (Analysis) → Quality assurance
11. Polish → File watching, auth, app shell

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (Spec Authoring) + US4 (Clarification) — editor-focused
   - Developer B: US2 (Pipeline) + US5 (Dashboard) — visualization-focused
   - Developer C: US3 (Planning & Tasks) — kanban board
   - Developer D: US6-US9 (Settings & Integrations)
   - Developer E: Polish (file watching, auth, app shell)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All file paths are relative to repository root
- Tauri commands (*.rs) and API routes (route.ts) can always be built in parallel for the same feature
