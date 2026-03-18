# Implementation Plan: Spec-Kit UI

**Branch**: `001-spec-kit-ui` | **Date**: 2026-03-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-spec-kit-ui/spec.md`

## Summary

Build a modern UI for spec-driven development that covers the complete spec-kit workflow (Specify → Clarify → Plan → Tasks → Implement). The application runs as both a Tauri 2 desktop app (local single-user with direct filesystem access) and a self-hosted Next.js web app (multi-user with authentication). It features a hybrid spec editor (structured forms + inline markdown + full markdown view), a kanban task board with drag-and-drop and dependency visualization, real-time file watching for external changes, and i18n support with English default. All data is persisted as Markdown files in `specs/` directories, maintaining full CLI compatibility with spec-kit.

## Technical Context

**Language/Version**: TypeScript 5.4+, Rust (Tauri 2 backend)
**Primary Dependencies**: Next.js 14, React 18, Tauri 2, TipTap (editor), dnd-kit (kanban), unified/remark (markdown parsing), Zustand (state), TanStack Query (data fetching), Tailwind CSS, Radix UI, next-intl (i18n), Better Auth (self-hosted auth), chokidar (server file watching)
**Storage**: File-based (Markdown in `specs/` directories) as source of truth; SQLite (via Better Auth) for user accounts in self-hosted mode
**Testing**: Vitest (unit), React Testing Library (component), Playwright (E2E)
**Target Platform**: Desktop (macOS, Windows, Linux via Tauri 2) + Web (modern browsers, self-hosted)
**Project Type**: Desktop app + Web application (monorepo, shared UI)
**Performance Goals**: <100ms UI interaction response, <1s file sync to disk, <10s cross-artifact analysis for 20 features, <2min spec creation
**Constraints**: Must preserve file-based format for CLI compatibility, i18n from day one, offline-capable in desktop mode, 300ms debounce on file watcher events
**Scale/Scope**: 100+ features per project, ~15 main views, up to 50 users in self-hosted mode

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

No constitution file exists (`memory/constitution.md` not found). Gate passes by default — no governance constraints to validate against. Recommend creating a constitution via `/speckit.constitution` before implementation begins.

**Post-Phase 1 re-check**: No violations. Monorepo structure with 3 packages (ui, web, desktop) is justified by the dual deployment requirement. All design decisions documented in research.md with rationale.

## Project Structure

### Documentation (this feature)

```text
specs/001-spec-kit-ui/
├── plan.md              # This file
├── research.md          # Phase 0: Technology decisions with rationale
├── data-model.md        # Phase 1: Entity model and relationships
├── quickstart.md        # Phase 1: Validation scenarios
├── contracts/
│   └── api-contract.md  # Phase 1: IPC + REST API contract
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
packages/
├── ui/                          # Shared React component library
│   ├── src/
│   │   ├── components/
│   │   │   ├── dashboard/       # Dashboard widgets, feature list, status cards
│   │   │   ├── editor/          # Hybrid spec editor (TipTap + forms)
│   │   │   │   ├── nodes/       # Custom TipTap nodes (UserStory, Requirement, etc.)
│   │   │   │   ├── forms/       # Structured form components per spec section
│   │   │   │   └── markdown/    # Full markdown view toggle
│   │   │   ├── pipeline/        # Workflow pipeline visualization
│   │   │   ├── kanban/          # Task board with dnd-kit
│   │   │   ├── clarification/   # Clarification dialog and history
│   │   │   ├── analysis/        # Cross-artifact analysis reports
│   │   │   ├── extensions/      # Extension & preset management panels
│   │   │   ├── agents/          # Agent configuration panel
│   │   │   ├── constitution/    # Constitution editor
│   │   │   └── common/          # Shared UI primitives (search, status badge, etc.)
│   │   ├── hooks/               # React hooks (useFeatures, useFileWatcher, etc.)
│   │   ├── stores/              # Zustand stores (feature, editor, kanban, settings)
│   │   ├── lib/
│   │   │   ├── parser/          # Markdown ↔ structured data (remark-based)
│   │   │   ├── analysis/        # Cross-artifact consistency engine
│   │   │   └── git/             # Git operations (branch, status)
│   │   ├── types/               # Shared TypeScript types
│   │   └── i18n/                # Locale files and i18n utilities
│   │       ├── messages/
│   │       │   ├── en.json
│   │       │   └── de.json
│   │       └── index.ts
│   └── tests/
│       ├── unit/                # Vitest unit tests for lib/
│       └── component/           # React Testing Library tests
│
├── web/                         # Next.js self-hosted web application
│   ├── src/
│   │   ├── app/                 # Next.js App Router
│   │   │   ├── (dashboard)/     # Dashboard layout group
│   │   │   │   ├── page.tsx     # Dashboard home
│   │   │   │   └── features/
│   │   │   │       ├── page.tsx # Feature list
│   │   │   │       └── [slug]/
│   │   │   │           ├── page.tsx        # Feature detail + pipeline
│   │   │   │           ├── spec/page.tsx   # Spec editor
│   │   │   │           ├── plan/page.tsx   # Plan editor
│   │   │   │           └── tasks/page.tsx  # Kanban board
│   │   │   ├── settings/
│   │   │   │   ├── extensions/page.tsx
│   │   │   │   ├── presets/page.tsx
│   │   │   │   ├── agents/page.tsx
│   │   │   │   └── constitution/page.tsx
│   │   │   ├── analysis/page.tsx
│   │   │   └── api/             # REST API routes
│   │   │       ├── features/
│   │   │       ├── constitution/
│   │   │       ├── extensions/
│   │   │       ├── presets/
│   │   │       ├── agents/
│   │   │       ├── analysis/
│   │   │       ├── events/      # SSE endpoint for file watcher
│   │   │       └── auth/        # Better Auth endpoints
│   │   ├── middleware.ts        # Auth + i18n middleware
│   │   └── lib/
│   │       ├── auth.ts          # Better Auth server config
│   │       ├── fs-service.ts    # File system service (chokidar watcher)
│   │       └── github.ts        # GitHub API client
│   └── tests/
│       ├── integration/         # API route integration tests
│       └── e2e/                 # Playwright E2E tests
│
└── desktop/                     # Tauri 2 desktop application
    ├── src/                     # Next.js static export (reuses packages/web pages)
    │   └── app/                 # Simplified App Router (no API routes, no auth)
    ├── src-tauri/
    │   ├── src/
    │   │   ├── main.rs          # Tauri entry point
    │   │   ├── commands/        # Tauri IPC commands
    │   │   │   ├── features.rs  # Feature CRUD
    │   │   │   ├── specs.rs     # Spec read/write
    │   │   │   ├── plans.rs     # Plan operations
    │   │   │   ├── tasks.rs     # Task operations
    │   │   │   ├── constitution.rs
    │   │   │   ├── extensions.rs
    │   │   │   ├── agents.rs
    │   │   │   ├── analysis.rs
    │   │   │   └── github.rs    # GitHub API via reqwest
    │   │   ├── watcher.rs       # File system watcher (notify crate)
    │   │   ├── parser.rs        # Markdown parsing (pulldown-cmark)
    │   │   └── git.rs           # Git operations (git2 crate)
    │   ├── Cargo.toml
    │   └── tauri.conf.json
    └── tests/
        └── e2e/                 # Tauri-specific E2E tests

turbo.json                       # Turborepo monorepo config
package.json                     # Root workspace
tsconfig.json                    # Shared TypeScript config
```

**Structure Decision**: Monorepo with Turborepo. Three packages — `packages/ui` (shared components and logic), `packages/web` (Next.js self-hosted app), and `packages/desktop` (Tauri app wrapping shared UI). This structure is required by the dual deployment model (desktop + web) specified in the clarification session. The shared `packages/ui` ensures both deployment modes use identical components while allowing mode-specific backends (Rust IPC vs Node.js API routes).

## Complexity Tracking

| Aspect | Decision | Justification |
|--------|----------|---------------|
| 3 packages in monorepo | Desktop + Web + Shared UI | Dual deployment requirement from clarification. Cannot be reduced — desktop needs Tauri (Rust), web needs Next.js server (Node.js), and components must be shared. |
| Dual file watching | Tauri plugin-fs + chokidar | Different runtimes (Rust vs Node.js) require different watchers. Abstracted behind shared `useFileWatcher` hook so UI code is identical. |
| Dual backend | Rust (Tauri IPC) + TypeScript (API routes) | Desktop has no server — Rust handles filesystem directly. Web server manages filesystem on behalf of authenticated users. API contract is identical. |
