// T096: Analysis report component
// Displays summary stats bar, issues grouped by severity, with clickable artifact links.
"use client";

import type { AnalysisIssue, AnalysisSummary } from '../../types/index';

// ── Severity styling ───────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<
  string,
  { icon: string; label: string; badgeClass: string; rowClass: string }
> = {
  error: {
    icon: 'E',
    label: 'Error',
    badgeClass: 'bg-red-100 text-red-800 border-red-300',
    rowClass: 'border-l-red-500',
  },
  warning: {
    icon: 'W',
    label: 'Warning',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    rowClass: 'border-l-amber-500',
  },
  info: {
    icon: 'I',
    label: 'Info',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
    rowClass: 'border-l-blue-500',
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  orphaned_requirement: 'Orphaned Requirement',
  missing_coverage: 'Missing Coverage',
  constitution_violation: 'Constitution Violation',
  inconsistency: 'Inconsistency',
};

// ── Summary bar ────────────────────────────────────────────────────────

function SummaryBar({ summary }: { summary: AnalysisSummary }) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-gray-6 bg-white p-4">
      <div className="text-sm font-semibold text-gray-12">
        {summary.totalIssues} issue{summary.totalIssues !== 1 ? 's' : ''} found
      </div>
      <div className="flex items-center gap-3">
        {summary.errors > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border bg-red-100 border-red-300 px-2.5 py-0.5 text-xs font-medium text-red-800">
            {summary.errors} error{summary.errors !== 1 ? 's' : ''}
          </span>
        )}
        {summary.warnings > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border bg-amber-100 border-amber-300 px-2.5 py-0.5 text-xs font-medium text-amber-800">
            {summary.warnings} warning{summary.warnings !== 1 ? 's' : ''}
          </span>
        )}
        {summary.infos > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border bg-blue-100 border-blue-300 px-2.5 py-0.5 text-xs font-medium text-blue-800">
            {summary.infos} info{summary.infos !== 1 ? 's' : ''}
          </span>
        )}
        {summary.totalIssues === 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border bg-green-100 border-green-300 px-2.5 py-0.5 text-xs font-medium text-green-800">
            All checks passed
          </span>
        )}
      </div>
    </div>
  );
}

// ── Issue row ──────────────────────────────────────────────────────────

function IssueRow({ issue }: { issue: AnalysisIssue }) {
  const severity = SEVERITY_CONFIG[issue.severity] ?? SEVERITY_CONFIG.info;
  const categoryLabel =
    CATEGORY_LABELS[issue.category] ?? issue.category;

  return (
    <div
      className={`border-l-4 ${severity.rowClass} rounded-r-lg border border-gray-4 bg-white p-3 transition-colors hover:bg-gray-2`}
    >
      <div className="flex items-start gap-3">
        {/* Severity icon */}
        <span
          className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border text-xs font-bold ${severity.badgeClass}`}
        >
          {severity.icon}
        </span>

        <div className="min-w-0 flex-1">
          {/* Category and artifact */}
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium text-gray-11">
              {categoryLabel}
            </span>
            <span className="text-gray-6">|</span>
            <a
              href={`/features/${issue.featureSlug}/spec`}
              className="text-accent-11 hover:underline"
            >
              {issue.featureSlug}
            </a>
            <span className="text-gray-6">|</span>
            <span className="text-gray-9">
              {issue.artifact}
              {issue.section ? ` / ${issue.section}` : ''}
              {issue.line !== null ? ` (line ${issue.line})` : ''}
            </span>
          </div>

          {/* Message */}
          <p className="mt-1 text-sm text-gray-12">{issue.message}</p>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────

interface AnalysisReportProps {
  issues: AnalysisIssue[];
  summary: AnalysisSummary;
}

export function AnalysisReport({ issues, summary }: AnalysisReportProps) {
  // Group issues by severity
  const errorIssues = issues.filter((i) => i.severity === 'error');
  const warningIssues = issues.filter((i) => i.severity === 'warning');
  const infoIssues = issues.filter((i) => i.severity === 'info');

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <SummaryBar summary={summary} />

      {/* Issues grouped by severity */}
      {errorIssues.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-red-800">
            Errors ({errorIssues.length})
          </h3>
          <div className="space-y-2">
            {errorIssues.map((issue, idx) => (
              <IssueRow key={`error-${idx}`} issue={issue} />
            ))}
          </div>
        </div>
      )}

      {warningIssues.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-amber-800">
            Warnings ({warningIssues.length})
          </h3>
          <div className="space-y-2">
            {warningIssues.map((issue, idx) => (
              <IssueRow key={`warning-${idx}`} issue={issue} />
            ))}
          </div>
        </div>
      )}

      {infoIssues.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-blue-800">
            Info ({infoIssues.length})
          </h3>
          <div className="space-y-2">
            {infoIssues.map((issue, idx) => (
              <IssueRow key={`info-${idx}`} issue={issue} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
