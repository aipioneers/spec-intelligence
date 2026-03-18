"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useBackend,
  LoadingSpinner,
  ErrorBoundary,
  useKanbanStore,
  KanbanBoard,
  useKanbanSync,
} from "@spec-intelligence/ui";
import type { Task, TaskStatus } from "@spec-intelligence/ui";

// ---------------------------------------------------------------------------
// Generate Tasks Button
// ---------------------------------------------------------------------------

function GenerateTasksButton({
  onGenerate,
}: {
  onGenerate: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await onGenerate();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to generate tasks";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [onGenerate]);

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
          loading
            ? "cursor-not-allowed bg-gray-4 text-gray-8"
            : "bg-accent-9 text-white hover:bg-accent-10"
        }`}
      >
        {loading ? (
          <>
            <LoadingSpinner size="sm" />
            Generating Tasks...
          </>
        ) : (
          <>
            <svg
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z"
              />
            </svg>
            Generate Tasks
          </>
        )}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------

function TasksPageInner({
  slug,
  hasTasks: initialHasTasks,
}: {
  slug: string;
  hasTasks: boolean;
}) {
  const router = useRouter();
  const backend = useBackend();
  const [hasTasks, setHasTasks] = useState(initialHasTasks);

  const {
    tasks,
    loading,
    error,
    loadTasks,
    tasksByStatus,
    isTaskBlocked,
    getBlockedReason,
    setTasks,
  } = useKanbanStore();

  const { handleStatusChange } = useKanbanSync({
    adapter: backend,
    slug,
  });

  // Load tasks on mount if they exist
  useEffect(() => {
    if (hasTasks) {
      loadTasks(backend, slug);
    }
  }, [backend, slug, hasTasks, loadTasks]);

  // Generate tasks handler
  const handleGenerate = useCallback(async () => {
    const generatedTasks = await backend.generateTasks(slug);
    setTasks(generatedTasks);
    setHasTasks(true);
  }, [backend, slug, setTasks]);

  // Feature name from slug
  const featureName = slug
    .replace(/^\d+-/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" label="Loading tasks..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-lg border border-red-300 bg-red-50 px-6 py-8 text-center">
          <h2 className="text-lg font-semibold text-red-900">
            Failed to load tasks
          </h2>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <div className="mt-4 flex justify-center gap-3">
            <button
              onClick={() => loadTasks(backend, slug)}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Retry
            </button>
            <button
              onClick={() => router.push("/features")}
              className="rounded-md px-4 py-2 text-sm font-medium text-gray-11 hover:bg-gray-3"
            >
              Back to Features
            </button>
          </div>
        </div>
      </div>
    );
  }

  const grouped = tasksByStatus();

  // Task statistics
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "Done").length;
  const progressPercent =
    totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div className="px-4 py-8">
      {/* Header */}
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/features/${slug}/plan`)}
              className="rounded-md p-1.5 text-gray-9 hover:bg-gray-3 hover:text-gray-11"
              aria-label="Back to plan"
            >
              <svg
                className="h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
                />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-12">{featureName}</h1>
              <p className="text-xs text-gray-9">
                {slug} &middot; Task Board
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Progress */}
            {totalTasks > 0 && (
              <div className="flex items-center gap-2">
                <div className="h-2 w-24 rounded-full bg-gray-4">
                  <div
                    className="h-2 rounded-full bg-green-500 transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-xs text-gray-9">
                  {doneTasks}/{totalTasks} ({progressPercent}%)
                </span>
              </div>
            )}

            {!hasTasks && (
              <GenerateTasksButton onGenerate={handleGenerate} />
            )}
          </div>
        </div>
      </div>

      {/* Kanban Board or Empty State */}
      <div className="mx-auto mt-6 max-w-7xl">
        {hasTasks && tasks.length > 0 ? (
          <KanbanBoard
            tasksByStatus={grouped}
            onStatusChange={handleStatusChange}
            isTaskBlocked={isTaskBlocked}
            getBlockedReasons={getBlockedReason}
            allTasks={tasks}
          />
        ) : hasTasks ? (
          <div className="rounded-lg border border-dashed border-gray-6 bg-gray-2 px-8 py-16 text-center">
            <h3 className="text-lg font-semibold text-gray-11">
              No tasks found
            </h3>
            <p className="mt-2 text-sm text-gray-9">
              The tasks.md file exists but contains no parseable tasks.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-6 bg-gray-2 px-8 py-16 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-7"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-semibold text-gray-11">
              No tasks yet
            </h3>
            <p className="mt-2 text-sm text-gray-9">
              Generate tasks from the plan to start tracking implementation
              progress.
            </p>
            <div className="mt-6">
              <GenerateTasksButton onGenerate={handleGenerate} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function TasksPageClient({
  slug,
  hasTasks,
}: {
  slug: string;
  hasTasks: boolean;
}) {
  return (
    <ErrorBoundary>
      <TasksPageInner slug={slug} hasTasks={hasTasks} />
    </ErrorBoundary>
  );
}
