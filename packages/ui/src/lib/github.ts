// T080: GitHub client types and helpers (client-side)
// Actual Octokit usage is server-side only — this module provides
// types and pure helper functions for mapping tasks to GitHub issues.

import type { Task, Priority, TaskPhase } from '../types/index';

// ── Types ──────────────────────────────────────────────────────────────

export interface GitHubIssue {
  title: string;
  body: string;
  labels: string[];
}

export interface ExportPreview {
  taskId: string;
  taskDescription: string;
  issue: GitHubIssue;
}

export interface ExportResult {
  taskId: string;
  success: boolean;
  issueNumber: number | null;
  issueUrl: string | null;
  error: string | null;
}

export interface ExportProgress {
  total: number;
  completed: number;
  current: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────

const PRIORITY_LABELS: Record<Priority, string> = {
  P1: 'priority: critical',
  P2: 'priority: medium',
  P3: 'priority: low',
};

const PHASE_LABELS: Record<TaskPhase, string> = {
  Setup: 'phase: setup',
  Foundation: 'phase: foundation',
  UserStory: 'phase: user-story',
  Polish: 'phase: polish',
};

/**
 * Generate GitHub labels from a task's priority and phase.
 */
export function generateLabels(task: Task): string[] {
  const labels: string[] = ['spec-intelligence'];

  labels.push(PRIORITY_LABELS[task.priority] ?? 'priority: medium');
  labels.push(PHASE_LABELS[task.phase] ?? 'phase: user-story');

  if (task.isParallel) {
    labels.push('parallel');
  }

  if (task.status === 'Blocked') {
    labels.push('blocked');
  }

  return labels;
}

/**
 * Map a Task to a GitHub issue payload (title + body + labels).
 */
export function taskToIssuePayload(
  task: Task,
  featureSlug: string,
): GitHubIssue {
  const depsList =
    task.dependencies.length > 0
      ? `\n\n**Dependencies**: ${task.dependencies.join(', ')}`
      : '';

  const filesList =
    task.filePaths.length > 0
      ? `\n\n**Files**:\n${task.filePaths.map((f) => `- \`${f}\``).join('\n')}`
      : '';

  const body = [
    `## ${task.id}: ${task.description}`,
    '',
    `**Feature**: \`${featureSlug}\``,
    `**Phase**: ${task.phase}`,
    `**Priority**: ${task.priority}`,
    `**Status**: ${task.status}`,
    `**Parallel**: ${task.isParallel ? 'Yes' : 'No'}`,
    depsList,
    filesList,
    '',
    '---',
    '_Exported from Spec Intelligence_',
  ]
    .filter((line) => line !== '')
    .join('\n');

  return {
    title: `[${task.id}] ${task.description}`,
    body,
    labels: generateLabels(task),
  };
}

/**
 * Build preview data for a list of tasks.
 */
export function buildExportPreview(
  tasks: Task[],
  featureSlug: string,
): ExportPreview[] {
  return tasks.map((task) => ({
    taskId: task.id,
    taskDescription: task.description,
    issue: taskToIssuePayload(task, featureSlug),
  }));
}
