# spec-intelligence

Turn feature descriptions into structured specs, plans, and tasks — visually.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-blue.svg)](https://typescriptlang.org)

A visual interface for spec-driven development. Write a feature description in plain text, and spec-intelligence generates a structured specification, clarifies ambiguities interactively, produces an implementation plan, and breaks it into tasks on a kanban board. Your specs stay as Markdown files — fully compatible with CLI workflows.

## Quick Start

```bash
npm install spec-intelligence
npx spec-intelligence dev
# Open http://localhost:3333
```

Or with Python:

```bash
pip install spec-intelligence
spec-intelligence dev
```

## The Spec-Driven Development Lifecycle

```
Specify → Clarify → Plan → Tasks → Implement
```

1. **Specify** — write a feature description, get a structured spec with user stories, requirements, and success criteria
2. **Clarify** — resolve `[NEEDS CLARIFICATION]` markers through guided dialogs with suggested options
3. **Plan** — generate an implementation plan with architecture decisions, data models, and contracts
4. **Tasks** — break the plan into a kanban board with dependencies, parallel-execution markers, and phase grouping
5. **Implement** — track progress as tasks move across the board

Every artifact is a Markdown file in your repo. The UI reads and writes them directly — no database, no lock-in.

## Features

- **Spec authoring** — create structured specifications from plain-text descriptions with a rich hybrid editor
- **Pipeline visualization** — see the full lifecycle for every feature at a glance
- **Kanban task board** — drag-and-drop tasks with phase grouping, dependency arrows, and parallel markers
- **Interactive clarification** — resolve ambiguities through guided dialogs with suggested options
- **Plan generation** — produce implementation plans with architecture decisions via local LLM
- **Extension system** — browse, install, and manage extensions and presets from configurable catalogs
- **Desktop + web** — Tauri desktop app for local use, self-hosted web app for team collaboration
- **File-first** — all specs live as Markdown in your repo, git-tracked, CLI-compatible
- **Cross-artifact analysis** — detect orphaned requirements, missing coverage, and consistency issues
- **GitHub issue export** — push tasks as GitHub issues with labels, dependencies, and bidirectional linking

## Architecture

Monorepo with three packages:

```
packages/
├── web/       # Next.js 14 — web application
├── desktop/   # Tauri 2 — desktop app with native file access
└── ui/        # Shared React components (Radix UI, TipTap, dnd-kit, Zustand)
```

## Development

```bash
git clone https://github.com/aipioneers/spec-intelligence.git
cd spec-intelligence
npm install

make dev          # Web app on localhost:3333
make desktop      # Tauri desktop app
make test         # Run all tests (Vitest + Playwright + Cargo)
make lint         # Lint all packages
```

Requires Node.js 20+. Desktop app requires Rust. LLM features require [Ollama](https://ollama.ai).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

[MIT](LICENSE)

---

Part of the [AI Pioneers](https://pioneers.ai) ecosystem · [code-explore](https://github.com/aipioneers/code-explore) · [code-adapt](https://github.com/aipioneers/code-adapt)
