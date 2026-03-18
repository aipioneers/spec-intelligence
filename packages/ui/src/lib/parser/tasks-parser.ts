// T013: Tasks markdown parser/serializer — parse tasks.md into Task[] and serialize back
// Parses checkbox status, task IDs, [P] markers, [USX] labels, phase headings

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { toString } from 'mdast-util-to-string';
import type { Root, ListItem } from 'mdast';
import type { Task, TaskPhase, TaskStatus } from '../../types/index';

/**
 * Parse a tasks.md markdown string into a Task array.
 */
export function parseTasks(markdown: string): Task[] {
  const tree = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .parse(markdown);

  const tasks: Task[] = [];
  let currentPhase: TaskPhase = 'Setup';
  let currentUserStory: string | null = null;

  for (const node of tree.children) {
    if (node.type === 'heading' && node.depth === 2) {
      const text = toString(node);
      currentPhase = derivePhase(text);
      currentUserStory = deriveUserStoryFromHeading(text);
    } else if (node.type === 'heading' && node.depth === 3) {
      const text = toString(node);
      // Phase 3+ headings may contain user story references
      currentUserStory = deriveUserStoryFromHeading(text);
    } else if (node.type === 'list') {
      for (const item of node.children) {
        if (item.type === 'listItem') {
          const task = parseTaskItem(item, currentPhase, currentUserStory);
          if (task) {
            tasks.push(task);
          }
        }
      }
    }
  }

  return tasks;
}

/**
 * Serialize a Task array back to valid tasks.md markdown.
 */
export function serializeTasks(tasks: Task[]): string {
  const lines: string[] = [];

  lines.push('# Tasks');
  lines.push('');

  // Group tasks by phase
  const phaseOrder: TaskPhase[] = ['Setup', 'Foundation', 'UserStory', 'Polish'];
  const grouped = new Map<TaskPhase, Task[]>();

  for (const phase of phaseOrder) {
    grouped.set(phase, []);
  }
  for (const task of tasks) {
    const existing = grouped.get(task.phase) || [];
    existing.push(task);
    grouped.set(task.phase, existing);
  }

  for (const phase of phaseOrder) {
    const phaseTasks = grouped.get(phase);
    if (!phaseTasks || phaseTasks.length === 0) continue;

    lines.push(`## Phase: ${phaseDisplayName(phase)}`);
    lines.push('');

    for (const task of phaseTasks) {
      lines.push(serializeTask(task));
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Update a single task's status in the raw markdown string.
 * Returns the updated markdown.
 */
export function updateTaskStatus(
  markdown: string,
  taskId: string,
  status: TaskStatus
): string {
  const checkbox = status === 'Done' ? '[x]' : '[ ]';

  // Match the task line by ID pattern
  // Handles: "- [ ] T001 ..." or "- [x] T001 ..."
  const regex = new RegExp(
    `^(\\s*-\\s*)\\[[ xX]\\](\\s+${escapeRegex(taskId)}\\b)`,
    'gm'
  );

  return markdown.replace(regex, `$1${checkbox}$2`);
}

// ---------- Internal Helpers ----------

function parseTaskItem(
  item: ListItem,
  phase: TaskPhase,
  inheritedUserStory: string | null = null
): Task | null {
  const text = toString(item);
  if (!text) return null;

  // Extract task ID (T001, T002, etc.)
  const idMatch = text.match(/\b(T\d{3,4})\b/);
  if (!idMatch) return null;

  const id = idMatch[1];

  // Determine status from checkbox
  const status = deriveStatus(item);

  // Check for [P] parallel marker
  const isParallel = /\[P\]/.test(text);

  // Check for user story reference [US1], [US2], etc.
  const usMatch = text.match(/\[US(\d+)\]/);
  const userStoryRef = usMatch ? `US${usMatch[1]}` : inheritedUserStory ?? null;

  // Extract description — everything after the ID and markers
  let description = text;
  // Remove the task ID
  description = description.replace(/\bT\d{3,4}\b/, '').trim();
  // Remove [P] marker
  description = description.replace(/\[P\]\s*/, '').trim();
  // Remove [USX] marker
  description = description.replace(/\[US\d+\]\s*/, '').trim();

  // Extract file paths from description (paths containing / with file extensions)
  const filePaths = extractFilePaths(description);

  // Extract dependencies — not explicitly in tasks.md format, derive from description
  const dependencies = extractDependencies(text);

  return {
    id,
    phase,
    userStoryRef,
    description,
    priority: 'P2', // Default; priority is not explicitly in task lines
    status,
    isParallel,
    dependencies,
    filePaths,
  };
}

function deriveStatus(item: ListItem): TaskStatus {
  // remark-gfm parses `- [x]` with checked=true, `- [ ]` with checked=false
  if (item.checked === true) return 'Done';
  if (item.checked === false) return 'Todo';
  return 'Todo';
}

function derivePhase(headingText: string): TaskPhase {
  const lower = headingText.toLowerCase();
  if (lower.includes('setup')) return 'Setup';
  if (lower.includes('foundational') || lower.includes('foundation')) return 'Foundation';
  if (lower.includes('polish') || lower.includes('cross-cutting')) return 'Polish';
  // Any User Story phase heading
  if (lower.includes('user story') || lower.includes('phase 3') || lower.includes('phase 4') ||
      lower.includes('phase 5') || lower.includes('phase 6') || lower.includes('phase 7') ||
      lower.includes('phase 8') || lower.includes('phase 9') || lower.includes('phase 10') ||
      lower.includes('phase 11')) {
    return 'UserStory';
  }
  return 'Setup';
}

function deriveUserStoryFromHeading(text: string): string | null {
  // Match "User Story X" in heading
  const match = text.match(/User Story (\d+)/i);
  if (match) return `US${match[1]}`;
  return null;
}

function extractFilePaths(text: string): string[] {
  const paths: string[] = [];
  // Match paths like packages/ui/src/... or src/...
  const regex = /(?:packages\/|src\/)[^\s,)]+\.\w+/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    paths.push(match[0]);
  }
  return paths;
}

function extractDependencies(text: string): string[] {
  const deps: string[] = [];
  // Look for explicit dependency references like "depends on T001"
  const regex = /depends?\s+on\s+(T\d{3,4})/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    deps.push(match[1]);
  }
  return deps;
}

function phaseDisplayName(phase: TaskPhase): string {
  switch (phase) {
    case 'Setup':
      return 'Setup';
    case 'Foundation':
      return 'Foundational';
    case 'UserStory':
      return 'User Story Implementation';
    case 'Polish':
      return 'Polish & Cross-Cutting Concerns';
  }
}

function serializeTask(task: Task): string {
  const checkbox = task.status === 'Done' ? '[x]' : '[ ]';
  const parallel = task.isParallel ? ' [P]' : '';
  const userStory = task.userStoryRef ? ` [${task.userStoryRef}]` : '';
  return `- ${checkbox} ${task.id}${parallel}${userStory} ${task.description}`;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
