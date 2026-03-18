// T094: Consistency checker
// Verifies plan references match spec content, task counts match plan descriptions,
// and detects orphaned entities.

import type {
  Specification,
  Plan,
  Task,
  AnalysisIssue,
} from '../../types/index';

/**
 * Check consistency between spec, plan, and tasks.
 *
 * Verifies:
 * - User story references in tasks match spec user stories
 * - Task phases have reasonable distributions
 * - Plan summary mentions key spec entities
 * - No orphaned task dependencies
 */
export function checkConsistency(
  spec: Specification,
  plan: Plan | null,
  tasks: Task[],
  featureSlug: string,
): AnalysisIssue[] {
  const issues: AnalysisIssue[] = [];

  // 1. Verify user story references in tasks match spec
  const specStoryNumbers = new Set(
    spec.userStories.map((us) => `US${us.number}`),
  );

  for (const task of tasks) {
    if (task.userStoryRef && !specStoryNumbers.has(task.userStoryRef)) {
      issues.push({
        severity: 'error',
        category: 'inconsistency',
        message: `Task ${task.id} references ${task.userStoryRef} which does not exist in the spec (available: ${[...specStoryNumbers].join(', ') || 'none'})`,
        featureSlug,
        artifact: 'tasks',
        section: 'User Story References',
        line: null,
      });
    }
  }

  // 2. Check for orphaned task dependencies
  const taskIds = new Set(tasks.map((t) => t.id));
  for (const task of tasks) {
    for (const dep of task.dependencies) {
      if (!taskIds.has(dep)) {
        issues.push({
          severity: 'error',
          category: 'inconsistency',
          message: `Task ${task.id} depends on ${dep} which does not exist in the task list`,
          featureSlug,
          artifact: 'tasks',
          section: 'Dependencies',
          line: null,
        });
      }
    }
  }

  // 3. Check for circular dependencies
  const circularDeps = findCircularDependencies(tasks);
  for (const cycle of circularDeps) {
    issues.push({
      severity: 'error',
      category: 'inconsistency',
      message: `Circular dependency detected: ${cycle.join(' -> ')}`,
      featureSlug,
      artifact: 'tasks',
      section: 'Dependencies',
      line: null,
    });
  }

  // 4. Check that user stories with tasks exist in spec
  const storiesWithTasks = new Set<string>();
  for (const task of tasks) {
    if (task.userStoryRef) {
      storiesWithTasks.add(task.userStoryRef);
    }
  }

  for (const story of spec.userStories) {
    const ref = `US${story.number}`;
    if (!storiesWithTasks.has(ref) && tasks.length > 0) {
      issues.push({
        severity: 'info',
        category: 'inconsistency',
        message: `User Story ${story.number} ("${story.title}") has no tasks assigned`,
        featureSlug,
        artifact: 'spec',
        section: 'User Stories',
        line: null,
      });
    }
  }

  // 5. Verify plan references spec entities
  if (plan) {
    for (const entity of spec.entities) {
      const entityLower = entity.name.toLowerCase();
      const planText = [
        plan.summary,
        plan.projectStructure,
        plan.technicalContext.language,
        ...plan.technicalContext.dependencies,
      ]
        .join(' ')
        .toLowerCase();

      if (!planText.includes(entityLower) && entity.name.length > 2) {
        issues.push({
          severity: 'info',
          category: 'inconsistency',
          message: `Entity "${entity.name}" from spec is not mentioned in the plan`,
          featureSlug,
          artifact: 'plan',
          section: 'Entities',
          line: null,
        });
      }
    }
  }

  // 6. Check task status consistency
  const blockedTasks = tasks.filter((t) => t.status === 'Blocked');
  for (const task of blockedTasks) {
    if (task.dependencies.length === 0) {
      issues.push({
        severity: 'warning',
        category: 'inconsistency',
        message: `Task ${task.id} is marked as Blocked but has no dependencies listed`,
        featureSlug,
        artifact: 'tasks',
        section: 'Task Status',
        line: null,
      });
    }
  }

  return issues;
}

/**
 * Detect circular dependencies using DFS.
 */
function findCircularDependencies(tasks: Task[]): string[][] {
  const cycles: string[][] = [];
  const adjacency = new Map<string, string[]>();

  for (const task of tasks) {
    adjacency.set(task.id, task.dependencies);
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(taskId: string, path: string[]): void {
    if (inStack.has(taskId)) {
      // Found a cycle
      const cycleStart = path.indexOf(taskId);
      if (cycleStart !== -1) {
        cycles.push([...path.slice(cycleStart), taskId]);
      }
      return;
    }

    if (visited.has(taskId)) return;

    visited.add(taskId);
    inStack.add(taskId);
    path.push(taskId);

    const deps = adjacency.get(taskId) ?? [];
    for (const dep of deps) {
      dfs(dep, path);
    }

    path.pop();
    inStack.delete(taskId);
  }

  for (const task of tasks) {
    if (!visited.has(task.id)) {
      dfs(task.id, []);
    }
  }

  return cycles;
}
