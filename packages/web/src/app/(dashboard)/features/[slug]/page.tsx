"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  useBackend,
  LoadingSpinner,
  ErrorBoundary,
  StatusBadge,
  Pipeline,
  derivePhases,
  usePipelineNavigation,
} from "@spec-intelligence/ui";
import type {
  Feature,
  Specification,
  Plan,
  Task,
  PipelinePhaseInfo,
} from "@spec-intelligence/ui";

// ── Sub-view selector ───────────────────────────────────────────────────

type ActiveView = "spec" | "plan" | "tasks";

function getDefaultView(phases: PipelinePhaseInfo[]): ActiveView {
  // Find the first in-progress phase and route to its artifact
  for (const phase of phases) {
    if (phase.status === "in-progress") {
      if (phase.artifact === "plan") return "plan";
      if (phase.artifact === "tasks") return "tasks";
      return "spec";
    }
  }
  return "spec";
}

// ── Placeholder sub-views ───────────────────────────────────────────────

function SpecSubView({ slug }: { slug: string }) {
  return (
    <div className="rounded-lg border border-gray-6 bg-white p-6">
      <h3 className="text-sm font-semibold text-gray-12">Specification</h3>
      <p className="mt-2 text-sm text-gray-9">
        Edit the specification for this feature.
      </p>
      <a
        href={`/features/${slug}/spec`}
        className="mt-3 inline-block text-sm font-medium text-accent-11 hover:underline"
      >
        Open Spec Editor
      </a>
    </div>
  );
}

function PlanSubView({ slug, plan }: { slug: string; plan: Plan | null }) {
  if (!plan) {
    return (
      <div className="rounded-lg border border-gray-6 bg-white p-6 text-center">
        <p className="text-sm text-gray-9">
          No plan generated yet. Complete the clarification phase first.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-6 bg-white p-6">
      <h3 className="text-sm font-semibold text-gray-12">Plan</h3>
      <p className="mt-2 text-sm text-gray-11">{plan.summary}</p>
      {plan.projectStructure && (
        <pre className="mt-3 rounded-md bg-gray-2 p-3 text-xs text-gray-11">
          {plan.projectStructure}
        </pre>
      )}
    </div>
  );
}

function TasksSubView({
  slug,
  tasks,
}: {
  slug: string;
  tasks: Task[] | null;
}) {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="rounded-lg border border-gray-6 bg-white p-6 text-center">
        <p className="text-sm text-gray-9">
          No tasks generated yet. Create a plan first.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-6 bg-white p-6">
      <h3 className="text-sm font-semibold text-gray-12">
        Tasks ({tasks.length})
      </h3>
      <ul className="mt-3 space-y-2">
        {tasks.map((task) => (
          <li
            key={task.id}
            className="flex items-start gap-3 rounded-md border border-gray-6 bg-gray-1 px-3 py-2"
          >
            <span
              className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs font-bold ${
                task.status === "Done"
                  ? "bg-green-100 text-green-800"
                  : task.status === "InProgress"
                    ? "bg-blue-100 text-blue-800"
                    : task.status === "Blocked"
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-3 text-gray-9"
              }`}
            >
              {task.status === "Done" ? "\u2713" : task.id.replace("T", "")}
            </span>
            <div className="flex-1">
              <p className="text-sm text-gray-12">{task.description}</p>
              <p className="mt-0.5 text-xs text-gray-9">
                {task.priority} &middot; {task.phase}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Main Feature Detail Page ────────────────────────────────────────────

function FeatureDetailContent() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const backend = useBackend();

  const [feature, setFeature] = useState<Feature | null>(null);
  const [spec, setSpec] = useState<Specification | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>("spec");
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);

  const { handlePhaseClick } = usePipelineNavigation(slug);

  // Load feature data
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await backend.getFeature(slug);
        setFeature(data.feature);
        setSpec(data.spec);
        setPlan(data.plan);
        setTasks(data.tasks);

        // Set default view based on pipeline state
        const phases = derivePhases(data.feature);
        setActiveView(getDefaultView(phases));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load feature";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [backend, slug]);

  const onPhaseClick = useCallback(
    (phase: PipelinePhaseInfo) => {
      const msg = handlePhaseClick(phase);
      if (msg) {
        setBlockedMessage(msg);
        setTimeout(() => setBlockedMessage(null), 3000);
      } else {
        // Map phase to active view instead of navigating
        if (phase.id === "specify" || phase.id === "clarify") {
          setActiveView("spec");
        } else if (phase.id === "plan") {
          setActiveView("plan");
        } else if (phase.id === "tasks" || phase.id === "implement") {
          setActiveView("tasks");
        }
      }
    },
    [handlePhaseClick],
  );

  // Feature name from slug
  const featureName = slug
    .replace(/^\d+-/, "")
    .split("-")
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" label="Loading feature..." />
      </div>
    );
  }

  if (error || !feature) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-lg border border-red-300 bg-red-50 px-6 py-8 text-center">
          <h2 className="text-lg font-semibold text-red-900">
            Failed to load feature
          </h2>
          <p className="mt-2 text-sm text-red-700">
            {error ?? "Feature not found"}
          </p>
          <button
            onClick={() => router.push("/features")}
            className="mt-4 rounded-md px-4 py-2 text-sm font-medium text-gray-11 hover:bg-gray-3"
          >
            Back to Features
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/features")}
            className="rounded-md p-1.5 text-gray-9 hover:bg-gray-3 hover:text-gray-11"
            aria-label="Back to features"
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
            <p className="text-xs text-gray-9">{slug}</p>
          </div>
        </div>
        <StatusBadge status={feature.status} />
      </div>

      {/* Pipeline Visualization */}
      <div className="mt-8 rounded-lg border border-gray-6 bg-white px-6 py-5">
        <Pipeline feature={feature} onPhaseClick={onPhaseClick} />
      </div>

      {/* Blocked message toast */}
      {blockedMessage && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          {blockedMessage}
        </div>
      )}

      {/* View tabs */}
      <div className="mt-6 flex gap-1 rounded-lg bg-gray-2 p-1">
        {(
          [
            { key: "spec", label: "Specification" },
            { key: "plan", label: "Plan" },
            { key: "tasks", label: "Tasks" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveView(tab.key)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeView === tab.key
                ? "bg-white text-gray-12 shadow-sm"
                : "text-gray-9 hover:text-gray-11"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active sub-view */}
      <div className="mt-4">
        {activeView === "spec" && <SpecSubView slug={slug} />}
        {activeView === "plan" && <PlanSubView slug={slug} plan={plan} />}
        {activeView === "tasks" && (
          <TasksSubView slug={slug} tasks={tasks} />
        )}
      </div>
    </div>
  );
}

export default function FeatureDetailPage() {
  return (
    <ErrorBoundary>
      <FeatureDetailContent />
    </ErrorBoundary>
  );
}
