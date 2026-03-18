# Data Model: Spec-Kit UI

**Branch**: `001-spec-kit-ui` | **Date**: 2026-03-17

## Overview

Spec-Kit UI is a file-first application. The canonical data store is the filesystem (Markdown files in `specs/` directories). The data model describes both the file-based entities and optional runtime/cache structures used for indexing and multi-user state in self-hosted mode.

## Core Entities

### Feature

The top-level unit of work. Derived from directory structure and git branch.

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| number | string (3-digit) | Directory prefix | Auto-incremented numeric identifier, e.g., "001" |
| shortName | string | Directory suffix | Hyphenated short name, e.g., "spec-kit-ui" |
| slug | string | Directory name | Full identifier: `{number}-{shortName}`, e.g., "001-spec-kit-ui" |
| branchName | string | Git | Git branch name, matches slug |
| status | enum | Derived | Draft, Clarifying, Planned, InProgress, Complete (derived from which artifacts exist) |
| createdAt | datetime | spec.md header | Parsed from "Created" field in spec |
| specPath | string | Filesystem | Absolute path to spec.md |
| planPath | string | Filesystem | Absolute path to plan.md (nullable if not yet created) |
| tasksPath | string | Filesystem | Absolute path to tasks.md (nullable if not yet created) |
| checklistPaths | string[] | Filesystem | Paths to checklist files in `checklists/` subdirectory |

**Status derivation rules**:
- `Draft`: spec.md exists, no plan.md
- `Clarifying`: spec.md contains [NEEDS CLARIFICATION] markers
- `Planned`: plan.md exists, no tasks.md
- `InProgress`: tasks.md exists with at least one task not complete
- `Complete`: tasks.md exists with all tasks marked complete

**Uniqueness**: Feature number is unique across all features in a project. Enforced by the `create-new-feature.sh` script.

### Specification

A structured document parsed from `spec.md`.

| Field | Type | Description |
|-------|------|-------------|
| title | string | Feature name from H1 heading |
| description | string | Input/description from header metadata |
| userStories | UserStory[] | Ordered list of user stories |
| edgeCases | string[] | List of edge case descriptions |
| requirements | Requirement[] | Functional requirements |
| entities | Entity[] | Key entities defined in spec |
| successCriteria | SuccessCriterion[] | Measurable outcomes |
| clarifications | Clarification[] | Session-grouped clarification history |
| assumptions | string[] | List of documented assumptions |

### UserStory

| Field | Type | Description |
|-------|------|-------------|
| number | number | Sequential story number (1, 2, 3...) |
| title | string | Brief title |
| priority | enum | P1, P2, P3 |
| description | string | Plain language journey description |
| priorityReason | string | Why this priority level |
| independentTest | string | How to test independently |
| acceptanceScenarios | AcceptanceScenario[] | Given/When/Then scenarios |

### AcceptanceScenario

| Field | Type | Description |
|-------|------|-------------|
| given | string | Initial state/precondition |
| when | string | Action performed |
| then | string | Expected outcome |

### Requirement

| Field | Type | Description |
|-------|------|-------------|
| id | string | Formatted as "FR-XXX" |
| description | string | What the system MUST do |
| hasClarificationMarker | boolean | Contains [NEEDS CLARIFICATION] |
| clarificationQuestion | string | The specific question if marker present (nullable) |

### SuccessCriterion

| Field | Type | Description |
|-------|------|-------------|
| id | string | Formatted as "SC-XXX" |
| description | string | Measurable outcome |

### Plan

A structured document parsed from `plan.md`.

| Field | Type | Description |
|-------|------|-------------|
| summary | string | Technical approach summary |
| technicalContext | TechnicalContext | Language, deps, storage, etc. |
| projectStructure | string | Source code layout |
| constitutionCheck | ConstitutionCheckResult | Gate pass/fail with details |

### TechnicalContext

| Field | Type | Description |
|-------|------|-------------|
| language | string | Language and version |
| dependencies | string[] | Primary dependencies |
| storage | string | Storage approach |
| testing | string | Test framework |
| targetPlatform | string | Platform targets |
| projectType | string | Library, CLI, web-service, etc. |
| performanceGoals | string | Domain-specific targets |
| constraints | string | Domain-specific limits |
| scaleScope | string | Expected scale |

### Task

Parsed from `tasks.md`. Each task is a line item within a phase group.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Task identifier (e.g., "T001") |
| phase | enum | Setup, Foundation, UserStory, Polish |
| userStoryRef | string | Reference to user story (nullable) |
| description | string | What to do |
| priority | enum | P1, P2, P3 |
| status | enum | Todo, InProgress, Done, Blocked |
| isParallel | boolean | Marked with [P] for parallel execution |
| dependencies | string[] | List of task IDs this depends on |
| filePaths | string[] | Files to create/modify |

**State transitions**:
- Todo → InProgress (manual, via drag-and-drop)
- InProgress → Done (manual, via drag-and-drop)
- InProgress → Blocked (automatic, when dependency task reverts from Done)
- Blocked → Todo (automatic, when blocking dependency completes)
- Any → Todo (manual, revert)

### Constitution

Parsed from `memory/constitution.md`. Project-wide governance document.

| Field | Type | Description |
|-------|------|-------------|
| principles | Principle[] | Core project principles |
| constraints | string[] | Hard constraints |
| developmentGuidelines | string[] | Workflow rules |
| version | string | Constitution version |
| lastAmended | datetime | Last amendment date |

### Principle

| Field | Type | Description |
|-------|------|-------------|
| name | string | Principle title |
| description | string | What it means |
| rationale | string | Why it matters |

### Extension

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique extension identifier |
| name | string | Display name |
| description | string | What it does |
| version | string | Installed version |
| catalogSource | string | Which catalog it came from |
| installedAt | datetime | When installed |
| status | enum | Active, Disabled |
| commands | string[] | Commands/templates it provides |

### Preset

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique preset identifier |
| name | string | Display name |
| description | string | What templates it provides |
| version | string | Installed version |
| templates | string[] | Template files included |
| isActive | boolean | Whether this preset is currently active |

### AgentConfig

| Field | Type | Description |
|-------|------|-------------|
| agentType | enum | claude, cursor, copilot, gemini, windsurf, qwen, etc. |
| directoryPath | string | Agent-specific directory (e.g., `.claude/`) |
| contextFilePath | string | Main agent context file path |
| commandsDir | string | Agent commands directory (nullable) |
| syncStatus | enum | UpToDate, Stale, NotInitialized |
| lastSyncedAt | datetime | Last sync timestamp (nullable) |

### Clarification

| Field | Type | Description |
|-------|------|-------------|
| sessionDate | date | Date of clarification session |
| question | string | The question asked |
| answer | string | The answer provided |

### Checklist

| Field | Type | Description |
|-------|------|-------------|
| name | string | Checklist title |
| purpose | string | What it validates |
| featureSlug | string | Which feature this belongs to |
| categories | ChecklistCategory[] | Grouped validation items |

### ChecklistItem

| Field | Type | Description |
|-------|------|-------------|
| description | string | What to validate |
| isComplete | boolean | Whether this item passes |
| category | string | Parent category name |

## Self-Hosted Mode Extensions

In self-hosted mode, these additional entities exist for multi-user support. They are stored in a lightweight database (SQLite via Better Auth), not in the filesystem.

### User (self-hosted only)

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique user identifier |
| email | string | Email address (unique) |
| name | string | Display name |
| role | enum | Viewer, Editor, Admin |
| createdAt | datetime | Account creation date |
| lastLoginAt | datetime | Last login timestamp |

### AuditEntry (self-hosted only)

| Field | Type | Description |
|-------|------|-------------|
| id | string | Entry identifier |
| userId | string | Who performed the action |
| action | enum | Create, Edit, Delete, Export, Sync |
| entityType | string | Feature, Spec, Plan, Task, Constitution, Extension, Preset |
| entityId | string | Which entity was affected |
| timestamp | datetime | When the action occurred |
| details | string | Additional context (nullable) |

## Entity Relationships

```
Project (filesystem root)
├── Constitution (0..1)
├── Feature (0..n)
│   ├── Specification (1)
│   │   ├── UserStory (1..n)
│   │   │   └── AcceptanceScenario (1..n)
│   │   ├── Requirement (1..n)
│   │   ├── SuccessCriterion (1..n)
│   │   └── Clarification (0..n)
│   ├── Plan (0..1)
│   ├── Task (0..n)
│   └── Checklist (0..n)
├── Extension (0..n)
├── Preset (0..n)
└── AgentConfig (0..n)
```

## Data Volume Assumptions

- Per project: up to 100+ features (per SC-010)
- Per feature: 5-15 user stories, 10-30 requirements, 20-80 tasks
- Per project: up to 10 extensions, 3-5 presets, 5-10 agent configurations
- Self-hosted: up to 50 users per project instance
