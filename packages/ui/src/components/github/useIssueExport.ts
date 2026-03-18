// T083: Hook managing GitHub issue export state
"use client";

import { useState, useCallback, useMemo } from 'react';
import type { Task } from '../../types/index';
import type { ExportPreview, ExportResult, ExportProgress } from '../../lib/github';
import { buildExportPreview, taskToIssuePayload } from '../../lib/github';

interface UseIssueExportOptions {
  tasks: Task[];
  featureSlug: string;
  /** Base URL for the REST API. Defaults to current origin. */
  baseUrl?: string;
}

interface UseIssueExportReturn {
  /** Preview data for all tasks. */
  preview: ExportPreview[];
  /** Trigger the export for the given repository and selected task IDs. */
  exportIssues: (repository: string, taskIds: string[]) => Promise<ExportResult[]>;
  /** Whether an export is currently in progress. */
  loading: boolean;
  /** Current export progress. */
  progress: ExportProgress | null;
  /** Results from the most recent export. */
  results: ExportResult[] | null;
  /** Error message if the export failed entirely. */
  error: string | null;
}

export function useIssueExport({
  tasks,
  featureSlug,
  baseUrl,
}: UseIssueExportOptions): UseIssueExportReturn {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [results, setResults] = useState<ExportResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(
    () => buildExportPreview(tasks, featureSlug),
    [tasks, featureSlug],
  );

  const exportIssues = useCallback(
    async (repository: string, taskIds: string[]): Promise<ExportResult[]> => {
      setLoading(true);
      setError(null);
      setResults(null);
      setProgress({ total: taskIds.length, completed: 0, current: null });

      try {
        const selectedTasks = tasks.filter((t) => taskIds.includes(t.id));
        const issuePayloads = selectedTasks.map((task) => ({
          taskId: task.id,
          payload: taskToIssuePayload(task, featureSlug),
        }));

        const origin = baseUrl ?? (typeof window !== 'undefined' ? window.location.origin : '');
        const url = `${origin}/api/features/${encodeURIComponent(featureSlug)}/github`;

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            repository,
            issues: issuePayloads,
            slug: featureSlug,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(
            body?.error?.message ?? `Export failed with status ${res.status}`,
          );
        }

        const data = (await res.json()) as { results: ExportResult[] };
        setResults(data.results);
        setProgress({
          total: taskIds.length,
          completed: taskIds.length,
          current: null,
        });
        return data.results;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Export failed';
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [tasks, featureSlug, baseUrl],
  );

  return { preview, exportIssues, loading, progress, results, error };
}
