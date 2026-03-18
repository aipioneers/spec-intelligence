// T095: Main analyzer — runs all checkers and aggregates results
// Orchestrates requirement coverage, constitution compliance, and consistency checks.

import type {
  Specification,
  Plan,
  Task,
  Constitution,
  AnalysisIssue,
  AnalysisSummary,
} from '../../types/index';
import { checkRequirementCoverage } from './requirement-coverage';
import { checkConstitutionCompliance } from './constitution-checker';
import { checkConsistency } from './consistency-checker';

export interface AnalysisInput {
  featureSlug: string;
  spec: Specification;
  plan: Plan | null;
  tasks: Task[];
}

export interface AnalysisResult {
  issues: AnalysisIssue[];
  summary: AnalysisSummary;
}

/**
 * Run all analysis checkers on a single feature.
 */
export function analyzeFeature(
  input: AnalysisInput,
  constitution: Constitution | null,
): AnalysisResult {
  const allIssues: AnalysisIssue[] = [];

  // 1. Requirement coverage analysis
  if (input.spec.requirements.length > 0 || input.tasks.length > 0) {
    const coverageIssues = checkRequirementCoverage(
      input.spec.requirements,
      input.tasks,
      input.featureSlug,
    );
    allIssues.push(...coverageIssues);
  }

  // 2. Constitution compliance check
  if (input.plan && constitution) {
    const constitutionIssues = checkConstitutionCompliance(
      input.plan,
      constitution,
      input.featureSlug,
    );
    allIssues.push(...constitutionIssues);
  }

  // 3. Consistency check
  const consistencyIssues = checkConsistency(
    input.spec,
    input.plan,
    input.tasks,
    input.featureSlug,
  );
  allIssues.push(...consistencyIssues);

  // Sort by severity (error first, then warning, then info)
  const severityOrder: Record<string, number> = {
    error: 0,
    warning: 1,
    info: 2,
  };
  allIssues.sort(
    (a, b) =>
      (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3),
  );

  // Build summary
  const summary = buildSummary(allIssues);

  return { issues: allIssues, summary };
}

/**
 * Run analysis across multiple features.
 */
export function analyzeAllFeatures(
  features: AnalysisInput[],
  constitution: Constitution | null,
): AnalysisResult {
  const allIssues: AnalysisIssue[] = [];

  for (const feature of features) {
    const { issues } = analyzeFeature(feature, constitution);
    allIssues.push(...issues);
  }

  // Sort by severity
  const severityOrder: Record<string, number> = {
    error: 0,
    warning: 1,
    info: 2,
  };
  allIssues.sort(
    (a, b) =>
      (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3),
  );

  const summary = buildSummary(allIssues);

  return { issues: allIssues, summary };
}

/**
 * Build an AnalysisSummary from a list of issues.
 */
function buildSummary(issues: AnalysisIssue[]): AnalysisSummary {
  return {
    totalIssues: issues.length,
    errors: issues.filter((i) => i.severity === 'error').length,
    warnings: issues.filter((i) => i.severity === 'warning').length,
    infos: issues.filter((i) => i.severity === 'info').length,
  };
}
