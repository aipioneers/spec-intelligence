// T092: Requirement coverage analysis
// Scans tasks for FR-XXX references and compares against spec requirements.
// Flags orphaned requirements and missing coverage.

import type {
  Requirement,
  Task,
  AnalysisIssue,
} from '../../types/index';

/**
 * Extract all FR-XXX references from a task description and file paths.
 */
function extractRequirementRefs(task: Task): string[] {
  const refs: string[] = [];
  const regex = /\bFR-\d+\b/g;

  let match;
  while ((match = regex.exec(task.description)) !== null) {
    refs.push(match[0]);
  }

  // Also check file paths for embedded references
  for (const filePath of task.filePaths) {
    let pathMatch;
    const pathRegex = /\bFR-\d+\b/g;
    while ((pathMatch = pathRegex.exec(filePath)) !== null) {
      refs.push(pathMatch[0]);
    }
  }

  return [...new Set(refs)];
}

/**
 * Check requirement coverage between spec requirements and tasks.
 *
 * Returns issues for:
 * - orphaned_requirement: requirement exists in spec but not referenced by any task
 * - missing_coverage: requirement referenced in tasks but not defined in spec
 */
export function checkRequirementCoverage(
  requirements: Requirement[],
  tasks: Task[],
  featureSlug: string,
): AnalysisIssue[] {
  const issues: AnalysisIssue[] = [];

  // Build set of requirement IDs from spec
  const specRequirementIds = new Set(requirements.map((r) => r.id));

  // Build set of requirement references from tasks
  const taskRequirementRefs = new Set<string>();
  for (const task of tasks) {
    for (const ref of extractRequirementRefs(task)) {
      taskRequirementRefs.add(ref);
    }
  }

  // Check for orphaned requirements (in spec but not in any task)
  for (const req of requirements) {
    if (!taskRequirementRefs.has(req.id)) {
      issues.push({
        severity: 'warning',
        category: 'orphaned_requirement',
        message: `Requirement ${req.id} is defined in the spec but not referenced by any task: "${req.description}"`,
        featureSlug,
        artifact: 'spec',
        section: 'Requirements',
        line: null,
      });
    }
  }

  // Check for missing coverage (referenced in tasks but not defined in spec)
  for (const ref of taskRequirementRefs) {
    if (!specRequirementIds.has(ref)) {
      issues.push({
        severity: 'error',
        category: 'missing_coverage',
        message: `Requirement ${ref} is referenced in tasks but not defined in the spec`,
        featureSlug,
        artifact: 'tasks',
        section: 'Requirements',
        line: null,
      });
    }
  }

  // Check for requirements with clarification markers that are referenced by tasks
  for (const req of requirements) {
    if (req.hasClarificationMarker && taskRequirementRefs.has(req.id)) {
      issues.push({
        severity: 'warning',
        category: 'missing_coverage',
        message: `Requirement ${req.id} needs clarification but has tasks assigned: "${req.clarificationQuestion}"`,
        featureSlug,
        artifact: 'spec',
        section: 'Requirements',
        line: null,
      });
    }
  }

  return issues;
}
