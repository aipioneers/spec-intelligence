# API Contract: Spec-Kit UI

**Branch**: `001-spec-kit-ui` | **Date**: 2026-03-17

## Overview

Spec-Kit UI exposes two interface layers:
1. **Internal IPC** (desktop mode): Tauri commands invoked from the React frontend via `@tauri-apps/api`
2. **REST API** (self-hosted mode): Next.js API routes for multi-user web access

Both layers share the same data shapes and semantics. The IPC commands map 1:1 to REST endpoints.

## Feature Endpoints

### List Features

**Purpose**: Retrieve all features in the project with their status and metadata.

- **IPC**: `invoke('list_features')`
- **REST**: `GET /api/features`
- **Response**: `Feature[]`
- **Filters**: `?status=Draft|Clarifying|Planned|InProgress|Complete` (optional)
- **Sort**: `?sort=number|name|status|created` (default: `number`)

### Get Feature Detail

**Purpose**: Retrieve a single feature with parsed spec, plan, and task data.

- **IPC**: `invoke('get_feature', { slug })`
- **REST**: `GET /api/features/:slug`
- **Response**: `{ feature: Feature, spec: Specification, plan: Plan | null, tasks: Task[] | null }`
- **Error**: `404` if feature directory not found

### Create Feature

**Purpose**: Create a new feature from a natural-language description.

- **IPC**: `invoke('create_feature', { description, shortName? })`
- **REST**: `POST /api/features`
- **Body**: `{ description: string, shortName?: string }`
- **Response**: `{ feature: Feature, spec: Specification }`
- **Side effects**: Creates git branch, directory structure, and spec.md
- **Error**: `409` if branch/number already exists

### Delete Feature

**Purpose**: Remove a feature and its artifacts.

- **IPC**: `invoke('delete_feature', { slug })`
- **REST**: `DELETE /api/features/:slug`
- **Response**: `{ success: boolean }`
- **Side effects**: Removes feature directory (does not delete git branch)
- **Error**: `404` if feature not found

## Specification Endpoints

### Get Spec

- **IPC**: `invoke('get_spec', { slug })`
- **REST**: `GET /api/features/:slug/spec`
- **Response**: `Specification` (parsed from spec.md)

### Update Spec

- **IPC**: `invoke('update_spec', { slug, spec })`
- **REST**: `PUT /api/features/:slug/spec`
- **Body**: `Specification` (structured data)
- **Response**: `{ spec: Specification, raw: string }` (returns both parsed and serialized markdown)
- **Side effects**: Writes spec.md to disk
- **Concurrency**: Returns `409` with diff if file was modified since last read (ETag-based)

### Update Spec Raw

- **IPC**: `invoke('update_spec_raw', { slug, markdown })`
- **REST**: `PUT /api/features/:slug/spec/raw`
- **Body**: `{ markdown: string }`
- **Response**: `{ spec: Specification }` (re-parsed from written markdown)
- **Side effects**: Writes raw markdown to spec.md

## Plan Endpoints

### Generate Plan

- **IPC**: `invoke('generate_plan', { slug })`
- **REST**: `POST /api/features/:slug/plan`
- **Response**: `{ plan: Plan }`
- **Prerequisite**: spec.md must exist and have no [NEEDS CLARIFICATION] markers
- **Side effects**: Creates plan.md
- **Error**: `422` if prerequisite not met

### Get Plan

- **IPC**: `invoke('get_plan', { slug })`
- **REST**: `GET /api/features/:slug/plan`
- **Response**: `Plan`
- **Error**: `404` if plan.md not found

### Update Plan

- **IPC**: `invoke('update_plan', { slug, plan })`
- **REST**: `PUT /api/features/:slug/plan`
- **Body**: `Plan`
- **Response**: `{ plan: Plan }`

## Task Endpoints

### Generate Tasks

- **IPC**: `invoke('generate_tasks', { slug })`
- **REST**: `POST /api/features/:slug/tasks`
- **Response**: `{ tasks: Task[] }`
- **Prerequisite**: plan.md must exist
- **Side effects**: Creates tasks.md
- **Error**: `422` if prerequisite not met

### List Tasks

- **IPC**: `invoke('list_tasks', { slug })`
- **REST**: `GET /api/features/:slug/tasks`
- **Response**: `Task[]`
- **Filters**: `?phase=Setup|Foundation|UserStory|Polish&status=Todo|InProgress|Done|Blocked`

### Update Task Status

- **IPC**: `invoke('update_task_status', { slug, taskId, status })`
- **REST**: `PATCH /api/features/:slug/tasks/:taskId`
- **Body**: `{ status: "Todo" | "InProgress" | "Done" | "Blocked" }`
- **Response**: `{ task: Task, affectedTasks: Task[] }` (includes tasks whose availability changed due to dependencies)
- **Side effects**: Updates tasks.md

### Reorder Tasks

- **IPC**: `invoke('reorder_tasks', { slug, taskId, targetPhase, targetIndex })`
- **REST**: `PATCH /api/features/:slug/tasks/:taskId/reorder`
- **Body**: `{ targetPhase: string, targetIndex: number }`
- **Response**: `{ tasks: Task[] }` (full updated list)

## Constitution Endpoints

### Get Constitution

- **IPC**: `invoke('get_constitution')`
- **REST**: `GET /api/constitution`
- **Response**: `Constitution | null`

### Update Constitution

- **IPC**: `invoke('update_constitution', { constitution })`
- **REST**: `PUT /api/constitution`
- **Body**: `Constitution`
- **Response**: `{ constitution: Constitution }`
- **Side effects**: Writes memory/constitution.md

## Clarification Endpoints

### Get Clarification Markers

- **IPC**: `invoke('get_clarification_markers', { slug })`
- **REST**: `GET /api/features/:slug/clarifications`
- **Response**: `{ markers: ClarificationMarker[], resolved: Clarification[] }`

### Resolve Clarification

- **IPC**: `invoke('resolve_clarification', { slug, markerId, answer })`
- **REST**: `POST /api/features/:slug/clarifications/:markerId/resolve`
- **Body**: `{ answer: string }`
- **Response**: `{ spec: Specification }` (updated spec with marker replaced)
- **Side effects**: Updates spec.md — replaces marker with answer, adds clarification history

## Extension & Preset Endpoints

### List Extensions

- **IPC**: `invoke('list_extensions')`
- **REST**: `GET /api/extensions`
- **Response**: `{ installed: Extension[], available: Extension[] }`

### Install Extension

- **IPC**: `invoke('install_extension', { extensionId })`
- **REST**: `POST /api/extensions/:extensionId/install`
- **Response**: `{ extension: Extension }`

### Remove Extension

- **IPC**: `invoke('remove_extension', { extensionId })`
- **REST**: `DELETE /api/extensions/:extensionId`
- **Response**: `{ success: boolean }`

### List Presets

- **IPC**: `invoke('list_presets')`
- **REST**: `GET /api/presets`
- **Response**: `{ installed: Preset[], available: Preset[] }`

### Install Preset

- **IPC**: `invoke('install_preset', { presetId })`
- **REST**: `POST /api/presets/:presetId/install`
- **Response**: `{ preset: Preset }`

### Remove Preset

- **IPC**: `invoke('remove_preset', { presetId })`
- **REST**: `DELETE /api/presets/:presetId`
- **Response**: `{ success: boolean }`

## Agent Configuration Endpoints

### List Agents

- **IPC**: `invoke('list_agents')`
- **REST**: `GET /api/agents`
- **Response**: `AgentConfig[]`

### Add Agent

- **IPC**: `invoke('add_agent', { agentType })`
- **REST**: `POST /api/agents`
- **Body**: `{ agentType: string }`
- **Response**: `{ agent: AgentConfig }`
- **Side effects**: Creates agent directory and config files

### Remove Agent

- **IPC**: `invoke('remove_agent', { agentType })`
- **REST**: `DELETE /api/agents/:agentType`
- **Response**: `{ success: boolean }`

### Sync Agent Context

- **IPC**: `invoke('sync_agent_context', { agentType? })`
- **REST**: `POST /api/agents/sync`
- **Body**: `{ agentType?: string }` (omit to sync all)
- **Response**: `{ agents: AgentConfig[] }` (updated sync status)
- **Side effects**: Runs update-agent-context.sh

## Analysis Endpoints

### Run Analysis

- **IPC**: `invoke('run_analysis', { slug? })`
- **REST**: `POST /api/analysis`
- **Body**: `{ slug?: string }` (omit for project-wide analysis)
- **Response**: `{ issues: AnalysisIssue[], summary: AnalysisSummary }`

### AnalysisIssue Shape

```
{
  severity: "error" | "warning" | "info",
  category: "orphaned_requirement" | "missing_coverage" | "constitution_violation" | "inconsistency",
  message: string,
  featureSlug: string,
  artifact: "spec" | "plan" | "tasks" | "constitution",
  section: string,
  line: number | null
}
```

## GitHub Integration Endpoints

### Preview Issue Export

- **IPC**: `invoke('preview_issue_export', { slug, taskIds? })`
- **REST**: `POST /api/features/:slug/github/preview`
- **Body**: `{ taskIds?: string[] }` (omit for all tasks)
- **Response**: `{ issues: GitHubIssuePreview[] }`

### Export to GitHub Issues

- **IPC**: `invoke('export_to_github', { slug, taskIds?, repository })`
- **REST**: `POST /api/features/:slug/github/export`
- **Body**: `{ taskIds?: string[], repository: string }`
- **Response**: `{ created: { taskId: string, issueNumber: number, issueUrl: string }[] }`
- **Side effects**: Creates GitHub issues, updates tasks.md with issue links
- **Requires**: `GH_TOKEN` or `GITHUB_TOKEN` environment variable

## File Watcher Events

The file watcher emits events to the frontend via:
- **Desktop**: Tauri event system (`listen('fs-change', ...)`)
- **Web**: Server-Sent Events (`GET /api/events`)

### Event Shape

```
{
  type: "created" | "modified" | "deleted",
  path: string,
  featureSlug: string | null,
  artifact: "spec" | "plan" | "tasks" | "checklist" | "unknown",
  timestamp: number
}
```

Events are debounced (300ms) to prevent rapid-fire updates during batch file operations.

## Authentication (Self-Hosted Only)

### Login

- **REST**: `POST /api/auth/login`
- **Body**: `{ email: string, password: string }`
- **Response**: `{ user: User, session: Session }`

### Current User

- **REST**: `GET /api/auth/me`
- **Response**: `User`
- **Error**: `401` if not authenticated

### Role-Based Access

All REST endpoints enforce role-based access:
- **Viewer**: Read-only access to all GET endpoints
- **Editor**: Full read/write access to features, specs, plans, tasks
- **Admin**: All Editor permissions plus user management, extension/preset management, constitution editing

## Error Response Shape

All errors follow a consistent format:

```
{
  error: {
    code: string,
    message: string,
    details: object | null
  }
}
```

Common error codes: `NOT_FOUND`, `CONFLICT`, `PREREQUISITE_FAILED`, `UNAUTHORIZED`, `FORBIDDEN`, `RATE_LIMITED`
