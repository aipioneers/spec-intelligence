// T093: Constitution compliance checker
// Compares plan decisions against constitution constraints.
// Checks for technology stack violations.

import type {
  Plan,
  Constitution,
  AnalysisIssue,
} from '../../types/index';

/**
 * Check a plan against constitution constraints and guidelines.
 *
 * Returns AnalysisIssue[] for any violations found.
 */
export function checkConstitutionCompliance(
  plan: Plan,
  constitution: Constitution,
  featureSlug: string,
): AnalysisIssue[] {
  const issues: AnalysisIssue[] = [];

  // Check the plan's own constitution check result
  if (!plan.constitutionCheck.passed) {
    issues.push({
      severity: 'error',
      category: 'constitution_violation',
      message:
        'Plan explicitly reports a constitution check failure: ' +
        plan.constitutionCheck.details.join('; '),
      featureSlug,
      artifact: 'plan',
      section: 'Constitution Check',
      line: null,
    });
  }

  // Check constraints against technical context
  for (const constraint of constitution.constraints) {
    const constraintLower = constraint.toLowerCase();
    const techContext = plan.technicalContext;

    // Check for language/technology constraints
    if (constraintLower.includes('must use') || constraintLower.includes('required')) {
      const requiredTech = extractTechNames(constraint);

      for (const tech of requiredTech) {
        const techLower = tech.toLowerCase();
        const contextStr = [
          techContext.language,
          ...techContext.dependencies,
          techContext.storage,
          techContext.testing,
          techContext.targetPlatform,
        ]
          .join(' ')
          .toLowerCase();

        if (!contextStr.includes(techLower)) {
          issues.push({
            severity: 'warning',
            category: 'constitution_violation',
            message: `Constitution constraint may not be satisfied: "${constraint}" (technology "${tech}" not found in plan's technical context)`,
            featureSlug,
            artifact: 'plan',
            section: 'Technical Context',
            line: null,
          });
        }
      }
    }

    // Check for "must not" / "forbidden" constraints
    if (
      constraintLower.includes('must not') ||
      constraintLower.includes('forbidden') ||
      constraintLower.includes('prohibited') ||
      constraintLower.includes('do not use')
    ) {
      const forbiddenTech = extractTechNames(constraint);

      for (const tech of forbiddenTech) {
        const techLower = tech.toLowerCase();
        const contextStr = [
          techContext.language,
          ...techContext.dependencies,
          techContext.storage,
          techContext.testing,
          techContext.targetPlatform,
          techContext.projectType,
        ]
          .join(' ')
          .toLowerCase();

        if (contextStr.includes(techLower)) {
          issues.push({
            severity: 'error',
            category: 'constitution_violation',
            message: `Constitution violation: "${constraint}" but "${tech}" is used in the plan`,
            featureSlug,
            artifact: 'plan',
            section: 'Technical Context',
            line: null,
          });
        }
      }
    }
  }

  // Check development guidelines
  for (const guideline of constitution.developmentGuidelines) {
    const guidelineLower = guideline.toLowerCase();

    // Check testing requirements
    if (
      guidelineLower.includes('test') &&
      (guidelineLower.includes('required') || guidelineLower.includes('must'))
    ) {
      if (!plan.technicalContext.testing) {
        issues.push({
          severity: 'warning',
          category: 'constitution_violation',
          message: `Development guideline "${guideline}" may not be addressed: no testing strategy specified in plan`,
          featureSlug,
          artifact: 'plan',
          section: 'Technical Context',
          line: null,
        });
      }
    }
  }

  return issues;
}

/**
 * Extract technology/tool names from a constraint string.
 * Looks for capitalized words, quoted strings, and common tech patterns.
 */
function extractTechNames(constraint: string): string[] {
  const names: string[] = [];

  // Match quoted strings
  const quotedMatches = constraint.match(/"([^"]+)"|'([^']+)'/g);
  if (quotedMatches) {
    for (const m of quotedMatches) {
      names.push(m.replace(/['"]/g, ''));
    }
  }

  // Match common technology patterns (capitalized words that look like tech names)
  const techPatterns =
    /\b(TypeScript|JavaScript|Python|Rust|Go|Java|Ruby|PHP|Swift|Kotlin|React|Vue|Angular|Next\.js|Node\.js|Express|FastAPI|Django|Prisma|MongoDB|PostgreSQL|MySQL|SQLite|Redis|Docker|Kubernetes|AWS|GCP|Azure|Supabase|Firebase|Tailwind|Bootstrap|jQuery|GraphQL|REST|gRPC)\b/gi;
  let match;
  while ((match = techPatterns.exec(constraint)) !== null) {
    names.push(match[1]);
  }

  return [...new Set(names)];
}
