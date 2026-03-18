"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useBackend,
  LoadingSpinner,
  ErrorBoundary,
  PlanEditor,
  GeneratePlanButton,
} from "@spec-intelligence/ui";
import type { Plan } from "@spec-intelligence/ui";

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------

function PlanEditorInner({
  slug,
  hasPlan: initialHasPlan,
}: {
  slug: string;
  hasPlan: boolean;
}) {
  const router = useRouter();
  const backend = useBackend();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [hasPlan, setHasPlan] = useState(initialHasPlan);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnresolvedClarifications, setHasUnresolvedClarifications] =
    useState(false);

  // Load plan on mount if it exists
  useEffect(() => {
    if (!hasPlan) {
      // Check spec for clarification markers
      backend
        .getSpec(slug)
        .then((spec) => {
          const hasClarifications = spec.requirements.some(
            (r) => r.hasClarificationMarker,
          );
          setHasUnresolvedClarifications(hasClarifications);
        })
        .catch(() => {
          // Ignore errors when checking spec
        });
      return;
    }

    setLoading(true);
    backend
      .getPlan(slug)
      .then((loadedPlan) => {
        setPlan(loadedPlan);
        setLoading(false);
      })
      .catch((err) => {
        const message =
          err instanceof Error ? err.message : "Failed to load plan";
        setError(message);
        setLoading(false);
      });
  }, [backend, slug, hasPlan]);

  // Save handler
  const handleSave = useCallback(
    async (updatedPlan: Plan) => {
      await backend.updatePlan(slug, updatedPlan);
      setPlan(updatedPlan);
    },
    [backend, slug],
  );

  // Generate plan handler
  const handleGenerate = useCallback(async () => {
    const generatedPlan = await backend.generatePlan(slug);
    setPlan(generatedPlan);
    setHasPlan(true);
  }, [backend, slug]);

  // Feature name from slug
  const featureName = slug
    .replace(/^\d+-/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" label="Loading plan..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-lg border border-red-300 bg-red-50 px-6 py-8 text-center">
          <h2 className="text-lg font-semibold text-red-900">
            Failed to load plan
          </h2>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <div className="mt-4 flex justify-center gap-3">
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                backend
                  .getPlan(slug)
                  .then((p) => {
                    setPlan(p);
                    setLoading(false);
                  })
                  .catch((e) => {
                    setError(
                      e instanceof Error ? e.message : "Failed to load plan",
                    );
                    setLoading(false);
                  });
              }}
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/features/${slug}/spec`)}
            className="rounded-md p-1.5 text-gray-9 hover:bg-gray-3 hover:text-gray-11"
            aria-label="Back to spec"
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
              {slug} &middot; Plan Editor
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!hasPlan && (
            <GeneratePlanButton
              hasUnresolvedClarifications={hasUnresolvedClarifications}
              onGenerate={handleGenerate}
            />
          )}

          {/* Next Step button — visible after plan exists */}
          {plan && (
            <button
              onClick={() => router.push(`/features/${slug}/tasks`)}
              className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
            >
              Next Step
              <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Plan Editor or Empty State */}
      <div className="mt-6">
        {plan ? (
          <PlanEditor plan={plan} onSave={handleSave} />
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
                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-semibold text-gray-11">
              No plan yet
            </h3>
            <p className="mt-2 text-sm text-gray-9">
              Generate a plan from the specification to start the implementation
              planning phase.
            </p>
            <div className="mt-6">
              <GeneratePlanButton
                hasUnresolvedClarifications={hasUnresolvedClarifications}
                onGenerate={handleGenerate}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function PlanEditorClient({
  slug,
  hasPlan,
}: {
  slug: string;
  hasPlan: boolean;
}) {
  return (
    <ErrorBoundary>
      <PlanEditorInner slug={slug} hasPlan={hasPlan} />
    </ErrorBoundary>
  );
}
