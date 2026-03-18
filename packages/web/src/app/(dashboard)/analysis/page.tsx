// T097: Analysis page — run analysis and display results
"use client";

import { useState, useCallback } from 'react';
import { AnalysisReport } from '@spec-intelligence/ui';
import type { AnalysisIssue, AnalysisSummary } from '@spec-intelligence/ui';

export default function AnalysisPage() {
  const [issues, setIssues] = useState<AnalysisIssue[] | null>(null);
  const [summary, setSummary] = useState<AnalysisSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIssues(null);
    setSummary(null);

    try {
      const res = await fetch('/api/analysis', {
        method: 'POST',
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.error?.message ?? `Analysis failed with status ${res.status}`,
        );
      }

      const data = await res.json();
      setIssues(data.issues);
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-12">Analysis</h1>
          <p className="mt-1 text-sm text-gray-9">
            Check requirement coverage, constitution compliance, and
            cross-artifact consistency.
          </p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="spec-button-primary"
        >
          {loading ? 'Analyzing...' : 'Run Analysis'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="mt-12 flex justify-center">
          <div className="flex items-center gap-3 text-sm text-gray-9">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-3 border-t-accent-9" />
            Running analysis across all features...
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && issues !== null && summary !== null && (
        <div className="mt-6">
          <AnalysisReport issues={issues} summary={summary} />
        </div>
      )}

      {/* Initial state */}
      {!loading && issues === null && !error && (
        <div className="mt-12 rounded-lg border border-gray-6 bg-gray-2 p-8 text-center">
          <p className="text-sm text-gray-9">
            Click &quot;Run Analysis&quot; to check your specifications for
            issues.
          </p>
        </div>
      )}
    </div>
  );
}
