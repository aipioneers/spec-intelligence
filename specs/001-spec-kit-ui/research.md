# Research: Spec-Kit UI

**Branch**: `001-spec-kit-ui` | **Date**: 2026-03-17

## Decision 1: Desktop Framework

**Decision**: Tauri 2
**Rationale**: 5-10x smaller resource footprint than Electron (~30-40MB vs ~200-300MB idle memory), native filesystem access via Rust backend, built-in file watching via the `notify` crate. Tauri requires `output: 'export'` (static site generation) from Next.js for desktop mode, which is acceptable since Tauri's Rust IPC replaces API routes in desktop mode.
**Alternatives considered**:
- Electron: Easier Next.js integration (no static export limitation), larger ecosystem, but dramatically heavier and bundles an entire Chromium instance unnecessarily.
- Neutralinojs: Lighter than Tauri but far less mature, limited plugin ecosystem.

**Architecture implication**: Monorepo with shared UI package — `apps/web` runs full Next.js server for self-hosted mode, `apps/desktop` uses Next.js static export + Tauri shell.

## Decision 2: Markdown Editor

**Decision**: TipTap
**Rationale**: Headless architecture integrates cleanly with existing Radix UI + Tailwind CSS design system. Custom ProseMirror node extensions allow creating spec-specific nodes (UserStory, Requirement, AcceptanceCriteria) that render as structured forms while serializing to markdown. TipTap's Markdown extension provides bidirectional conversion between its JSON document model and markdown text.
**Alternatives considered**:
- Plate (Slate.js): Strong contender with batteries-included UI, but Slate's data model has had breaking API changes historically. Second choice.
- BlockNote: Fast to prototype but opinionated UI conflicts with Radix UI/Tailwind design system.
- Milkdown: Architecturally clean but requires significantly more manual work and has smaller community.

**Three editing modes (FR-003)**:
- Structured forms: Custom TipTap node views rendered as React components with form inputs
- Inline markdown: TipTap's standard rich-text editing with markdown shortcuts
- Full markdown view: Toggle to raw CodeMirror/Monaco pane, syncing through TipTap's markdown extension

## Decision 3: Drag-and-Drop

**Decision**: dnd-kit
**Rationale**: Actively maintained, supports cross-container dragging (tasks between phase columns), custom collision detection (for dependency constraint validation), custom drag overlays, and built-in accessibility. The `@dnd-kit/sortable` preset is specifically designed for kanban columns.
**Alternatives considered**:
- @hello-pangea/dnd: Simpler API, polished animations, but is a community fork of Atlassian's abandoned react-beautiful-dnd — long-term maintenance uncertain. Less flexible for custom drag behaviors.
- Pragmatic drag and drop (Atlassian): Framework-agnostic replacement, still relatively new with smaller React ecosystem.

## Decision 4: File Watching

**Decision**: Dual strategy — Tauri's `@tauri-apps/plugin-fs` watcher for desktop, chokidar v4+ for self-hosted web server
**Rationale**: The two deployment modes run in different runtimes (Rust/WebView vs Node.js). Tauri's watcher wraps the Rust `notify` crate using native OS APIs (FSEvents/inotify/ReadDirectoryChangesW). Chokidar is the Node.js standard (~30M repos). Both are abstracted behind a shared `useFileWatcher(path)` React hook interface.
**Alternatives considered**:
- Node.js native `fs.watch`: Cross-platform inconsistencies that chokidar normalizes.
- @parcel/watcher: Good performance but less widely adopted.

## Decision 5: Internationalization

**Decision**: next-intl
**Rationale**: The only viable i18n library for Next.js 14 App Router. `next-i18next` is incompatible with the App Router. next-intl supports React Server Components natively, has ~2KB bundle size, and supports static export (needed for Tauri desktop mode) via `unstable_setRequestLocale`.
**Alternatives considered**:
- i18next/react-i18next: Most mature ecosystem but designed for client-side React, requires significant boilerplate for App Router server components.
- Intlayer: Too immature for production use.

## Decision 6: Authentication (Self-Hosted Mode)

**Decision**: Better Auth
**Rationale**: Self-hosted by design (unlike Auth.js which has Vercel-centric defaults). Email/password is first-class, full TypeScript type safety, plugin architecture for MFA and rate limiting. Role-based access (viewer/editor/admin per FR-020) is cleanly implementable. Lucia Auth (the previous standard) is deprecated since March 2025.
**Alternatives considered**:
- Auth.js v5 (NextAuth): Viable fallback for extensive OAuth provider support, but email/password auth configuration is more cumbersome. Good second choice if GitHub OAuth login is prioritized.
- Custom JWT: Maximum control but significant security engineering burden.
- Clerk/Kinde: Cloud-hosted services, not suitable for self-hosted deployment model.

**Note**: Desktop mode requires no authentication per spec.

## Decision 7: Markdown Parsing/Serialization

**Decision**: unified/remark
**Rationale**: The core operation is bidirectional: parse spec markdown into structured data (for form editing) and serialize structured data back to markdown (for file persistence). Remark's mdast (Markdown Abstract Syntax Tree) + remark-stringify provides roundtrip fidelity. Plugin ecosystem includes remark-gfm, remark-frontmatter, and remark-directive for [NEEDS CLARIFICATION] marker handling.
**Alternatives considered**:
- markdown-it: Faster raw parsing, but parse-only (no serializer for markdown-to-markdown roundtrip). Not designed for AST manipulation.
- marked: High performance but same serialization limitation.

**Architecture**: file (markdown) → remark (mdast) → transform → TipTap JSON → editor, and reverse for saving.

## Summary

| Decision | Choice | Runner-Up | Key Factor |
|----------|--------|-----------|------------|
| Desktop framework | Tauri 2 | Electron | 5-10x smaller footprint, native fs via Rust |
| Markdown editor | TipTap | Plate | Headless (fits Radix/Tailwind), custom node extensions |
| Drag-and-drop | dnd-kit | @hello-pangea/dnd | Active maintenance, flexible collision detection |
| File watching | Tauri plugin-fs + chokidar | — | Different runtimes require different solutions |
| i18n | next-intl | — | Only viable option for Next.js App Router |
| Auth (self-hosted) | Better Auth | Auth.js v5 | Self-hosted-first, email/password first class |
| Markdown parsing | unified/remark | markdown-it | Bidirectional parse/serialize, AST transforms |
