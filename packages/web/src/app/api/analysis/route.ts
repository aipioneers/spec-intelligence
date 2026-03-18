// T098: Analysis API route
// POST: run analysis across all features, return issues + summary

import { NextResponse } from 'next/server';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type {
  AnalysisIssue,
  AnalysisSummary,
  Requirement,
} from '@spec-intelligence/ui';
import { getProjectRoot } from "../../../lib/project-root";

/**
 * Minimal spec parser for analysis — extracts requirements and user stories.
 */
function parseSpecForAnalysis(content: string): {
  requirements: Requirement[];
  userStoryNumbers: number[];
  entities: string[];
} {
  const requirements: Requirement[] = [];
  const userStoryNumbers: number[] = [];
  const entities: string[] = [];

  // Extract requirements (FR-XXX: description)
  const reqRegex = /(?:^|\n)\s*[-*]\s*(FR-\d+):\s*(.+)/g;
  let reqMatch;
  while ((reqMatch = reqRegex.exec(content)) !== null) {
    const id = reqMatch[1];
    const desc = reqMatch[2].trim();
    const hasClarification = /\[NEEDS CLARIFICATION/i.test(desc);
    const clarificationMatch = desc.match(
      /\[NEEDS CLARIFICATION:\s*(.+?)\]/i,
    );

    requirements.push({
      id,
      description: desc,
      hasClarificationMarker: hasClarification,
      clarificationQuestion: clarificationMatch?.[1]?.trim() ?? null,
    });
  }

  // Extract user story numbers
  const usRegex = /User Story (\d+)/gi;
  let usMatch;
  while ((usMatch = usRegex.exec(content)) !== null) {
    userStoryNumbers.push(parseInt(usMatch[1], 10));
  }

  // Extract entities (from Key Entities section)
  const entityRegex = /[-*]\s+\*?\*?([^:*]+)\*?\*?:\s*/g;
  const inEntities = content.includes('Key Entit');
  if (inEntities) {
    const entitySection = content.split(/Key Entit/i)[1]?.split(/\n## /)[0] ?? '';
    let entityMatch;
    while ((entityMatch = entityRegex.exec(entitySection)) !== null) {
      entities.push(entityMatch[1].trim());
    }
  }

  return { requirements, userStoryNumbers, entities };
}

/**
 * Minimal task parser for analysis — extracts task IDs and references.
 */
function parseTasksForAnalysis(
  content: string,
): { id: string; description: string; userStoryRef: string | null; dependencies: string[] }[] {
  const tasks: {
    id: string;
    description: string;
    userStoryRef: string | null;
    dependencies: string[];
  }[] = [];

  const taskRegex = /- \[[ xX]\]\s*(T\d{3,4})\s*(.*)/gm;
  let match;
  while ((match = taskRegex.exec(content)) !== null) {
    const id = match[1];
    const rest = match[2];

    const usMatch = rest.match(/\[US(\d+)\]/);
    const userStoryRef = usMatch ? `US${usMatch[1]}` : null;

    const depMatch = rest.match(/depends?\s+on\s+(T\d{3,4})/gi);
    const dependencies = depMatch
      ? depMatch.map((d) => {
          const m = d.match(/(T\d{3,4})/);
          return m ? m[1] : '';
        }).filter(Boolean)
      : [];

    const description = rest
      .replace(/\[P\]\s*/, '')
      .replace(/\[US\d+\]\s*/, '')
      .trim();

    tasks.push({ id, description, userStoryRef, dependencies });
  }

  return tasks;
}

/**
 * Check requirement coverage — simplified server-side version.
 */
function checkCoverage(
  requirements: Requirement[],
  taskDescriptions: string[],
  featureSlug: string,
): AnalysisIssue[] {
  const issues: AnalysisIssue[] = [];

  // Build set of requirement refs from tasks
  const taskRefs = new Set<string>();
  for (const desc of taskDescriptions) {
    const refs = desc.match(/\bFR-\d+\b/g);
    if (refs) refs.forEach((r) => taskRefs.add(r));
  }

  // Orphaned requirements
  for (const req of requirements) {
    if (!taskRefs.has(req.id)) {
      issues.push({
        severity: 'warning',
        category: 'orphaned_requirement',
        message: `Requirement ${req.id} is not referenced by any task`,
        featureSlug,
        artifact: 'spec',
        section: 'Requirements',
        line: null,
      });
    }
  }

  // Missing coverage
  const specIds = new Set(requirements.map((r) => r.id));
  for (const ref of taskRefs) {
    if (!specIds.has(ref)) {
      issues.push({
        severity: 'error',
        category: 'missing_coverage',
        message: `Requirement ${ref} is referenced in tasks but not defined in spec`,
        featureSlug,
        artifact: 'tasks',
        section: 'Requirements',
        line: null,
      });
    }
  }

  return issues;
}

// ── POST /api/analysis ─────────────────────────────────────────────────

export async function POST() {
  try {
    const root = getProjectRoot();
    const specsDir = join(root, 'specs');

    if (!existsSync(specsDir)) {
      return NextResponse.json(
        { issues: [], summary: { totalIssues: 0, errors: 0, warnings: 0, infos: 0 } },
        { status: 200 },
      );
    }

    const allIssues: AnalysisIssue[] = [];

    // Load constitution if it exists
    const constitutionPath = join(root, 'constitution.md');
    let constitutionContent: string | null = null;
    if (existsSync(constitutionPath)) {
      constitutionContent = readFileSync(constitutionPath, 'utf-8');
    }

    // Scan all feature directories
    const entries = readdirSync(specsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (!/^\d{3}-/.test(entry.name)) continue;

      const featureSlug = entry.name;
      const featureDir = join(specsDir, featureSlug);

      // Read spec
      const specPath = join(featureDir, 'spec.md');
      if (!existsSync(specPath)) continue;

      const specContent = readFileSync(specPath, 'utf-8');
      const { requirements, userStoryNumbers, entities } =
        parseSpecForAnalysis(specContent);

      // Read tasks
      const tasksPath = join(featureDir, 'tasks.md');
      let tasks: ReturnType<typeof parseTasksForAnalysis> = [];
      if (existsSync(tasksPath)) {
        const tasksContent = readFileSync(tasksPath, 'utf-8');
        tasks = parseTasksForAnalysis(tasksContent);
      }

      // 1. Requirement coverage
      const taskDescriptions = tasks.map((t) => t.description);
      const coverageIssues = checkCoverage(
        requirements,
        taskDescriptions,
        featureSlug,
      );
      allIssues.push(...coverageIssues);

      // 2. User story reference consistency
      const storyRefs = new Set(
        userStoryNumbers.map((n) => `US${n}`),
      );
      for (const task of tasks) {
        if (task.userStoryRef && !storyRefs.has(task.userStoryRef)) {
          allIssues.push({
            severity: 'error',
            category: 'inconsistency',
            message: `Task ${task.id} references ${task.userStoryRef} which is not in the spec`,
            featureSlug,
            artifact: 'tasks',
            section: 'User Story References',
            line: null,
          });
        }
      }

      // 3. Task dependency consistency
      const taskIds = new Set(tasks.map((t) => t.id));
      for (const task of tasks) {
        for (const dep of task.dependencies) {
          if (!taskIds.has(dep)) {
            allIssues.push({
              severity: 'error',
              category: 'inconsistency',
              message: `Task ${task.id} depends on ${dep} which does not exist`,
              featureSlug,
              artifact: 'tasks',
              section: 'Dependencies',
              line: null,
            });
          }
        }
      }

      // 4. Constitution check (basic)
      if (constitutionContent) {
        const planPath = join(featureDir, 'plan.md');
        if (existsSync(planPath)) {
          const planContent = readFileSync(planPath, 'utf-8');

          // Check for explicit failure markers in plan
          if (/constitution.*fail/i.test(planContent)) {
            allIssues.push({
              severity: 'error',
              category: 'constitution_violation',
              message: 'Plan reports a constitution check failure',
              featureSlug,
              artifact: 'plan',
              section: 'Constitution Check',
              line: null,
            });
          }
        }
      }
    }

    // Sort by severity
    const severityOrder: Record<string, number> = {
      error: 0,
      warning: 1,
      info: 2,
    };
    allIssues.sort(
      (a, b) =>
        (severityOrder[a.severity] ?? 3) -
        (severityOrder[b.severity] ?? 3),
    );

    const summary: AnalysisSummary = {
      totalIssues: allIssues.length,
      errors: allIssues.filter((i) => i.severity === 'error').length,
      warnings: allIssues.filter((i) => i.severity === 'warning').length,
      infos: allIssues.filter((i) => i.severity === 'info').length,
    };

    return NextResponse.json({ issues: allIssues, summary }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message, details: null } },
      { status: 500 },
    );
  }
}
