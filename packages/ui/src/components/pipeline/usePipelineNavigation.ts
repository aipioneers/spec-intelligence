"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { PipelinePhaseInfo } from "../../types";

// ── Prerequisite messages ───────────────────────────────────────────────

const PREREQUISITE_MESSAGES: Record<string, string> = {
  clarify: "Complete the Specify phase first.",
  plan: "Resolve all clarification markers before planning.",
  tasks: "Generate or create a plan before defining tasks.",
  implement: "Define tasks before starting implementation.",
};

// ── Phase-to-route mapping ──────────────────────────────────────────────

function getPhaseRoute(slug: string, phaseId: string): string | null {
  switch (phaseId) {
    case "specify":
      return `/features/${slug}/spec`;
    case "clarify":
      return `/features/${slug}/spec`; // clarification happens inside spec view
    case "plan":
      return `/features/${slug}/plan`;
    case "tasks":
      return `/features/${slug}/tasks`;
    case "implement":
      return `/features/${slug}/tasks`; // implementation tracked via task list
    default:
      return null;
  }
}

// ── Hook ────────────────────────────────────────────────────────────────

interface UsePipelineNavigationResult {
  /**
   * Handle a phase click. Navigates to the phase's artifact editor if the
   * phase is complete or in-progress. Shows a tooltip message if blocked.
   *
   * Returns the prerequisite message if the phase is blocked, or null if
   * navigation was triggered.
   */
  handlePhaseClick: (phase: PipelinePhaseInfo) => string | null;
}

export function usePipelineNavigation(
  slug: string,
): UsePipelineNavigationResult {
  const router = useRouter();

  const handlePhaseClick = useCallback(
    (phase: PipelinePhaseInfo): string | null => {
      if (phase.status === "blocked") {
        return (
          PREREQUISITE_MESSAGES[phase.id] ??
          "Complete the previous phase first."
        );
      }

      const route = getPhaseRoute(slug, phase.id);
      if (route) {
        router.push(route);
      }

      return null;
    },
    [slug, router],
  );

  return { handlePhaseClick };
}
