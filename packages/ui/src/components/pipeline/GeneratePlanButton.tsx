"use client";

import { useState, useCallback } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { LoadingSpinner } from "../common/LoadingSpinner";

// ── Types ──────────────────────────────────────────────────────────────

interface GeneratePlanButtonProps {
  /** Whether the spec has unresolved NEEDS CLARIFICATION markers. */
  hasUnresolvedClarifications: boolean;
  /** Callback to generate the plan via the backend adapter. */
  onGenerate: () => Promise<void>;
  /** Optional CSS class. */
  className?: string;
}

// ── Component ──────────────────────────────────────────────────────────

export function GeneratePlanButton({
  hasUnresolvedClarifications,
  onGenerate,
  className = "",
}: GeneratePlanButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDisabled = hasUnresolvedClarifications || loading;

  const handleClick = useCallback(async () => {
    if (isDisabled) return;
    setLoading(true);
    setError(null);

    try {
      await onGenerate();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to generate plan";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [isDisabled, onGenerate]);

  const button = (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
        isDisabled
          ? "cursor-not-allowed bg-gray-4 text-gray-8"
          : "bg-accent-9 text-white hover:bg-accent-10"
      } ${className}`}
    >
      {loading ? (
        <>
          <LoadingSpinner size="sm" />
          Generating Plan...
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
              d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
            />
          </svg>
          Generate Plan
        </>
      )}
    </button>
  );

  return (
    <div>
      {hasUnresolvedClarifications ? (
        <Tooltip.Provider delayDuration={200}>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>{button}</Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                side="top"
                sideOffset={6}
                className="max-w-xs rounded-md bg-gray-12 px-3 py-2 text-xs text-gray-1 shadow-md"
              >
                Cannot generate plan: the specification has unresolved
                [NEEDS CLARIFICATION] markers. Please resolve all
                clarification questions first.
                <Tooltip.Arrow className="fill-gray-12" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
      ) : (
        button
      )}

      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
