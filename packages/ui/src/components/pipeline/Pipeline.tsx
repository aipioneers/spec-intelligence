"use client";

import type { Feature, PipelinePhaseInfo } from "../../types";
import { PipelinePhase } from "./PipelinePhase";
import { PipelineConnector } from "./PipelineConnector";

// ── Phase derivation ────────────────────────────────────────────────────

const PHASE_DEFS = [
  { id: "specify", label: "Specify", artifact: "spec" as const },
  { id: "clarify", label: "Clarify", artifact: null },
  { id: "plan", label: "Plan", artifact: "plan" as const },
  { id: "tasks", label: "Tasks", artifact: "tasks" as const },
  { id: "implement", label: "Implement", artifact: null },
] as const;

/**
 * Derive the five pipeline phases from a Feature object.
 *
 * Rules:
 *  - Specify: complete if spec exists (specPath is set)
 *  - Clarify: complete if status is NOT "Clarifying" and spec exists
 *  - Plan:    complete if planPath exists
 *  - Tasks:   complete if tasksPath exists
 *  - Implement: complete if feature status is "Complete"
 *
 * A phase is "in-progress" if all previous phases are complete but this one
 * is not. A phase is "blocked" if a prior phase is not yet complete.
 */
export function derivePhases(feature: Feature): PipelinePhaseInfo[] {
  const phaseComplete: boolean[] = [
    // Specify: spec always exists for a feature
    Boolean(feature.specPath),
    // Clarify: not Clarifying status (no unresolved markers)
    Boolean(feature.specPath) && feature.status !== "Clarifying",
    // Plan: plan.md exists
    Boolean(feature.planPath),
    // Tasks: tasks.md exists
    Boolean(feature.tasksPath),
    // Implement: all tasks done
    feature.status === "Complete",
  ];

  return PHASE_DEFS.map((def, idx) => {
    // Check if all prior phases are complete
    const allPriorComplete = phaseComplete
      .slice(0, idx)
      .every((c) => c === true);

    let status: PipelinePhaseInfo["status"];

    if (phaseComplete[idx]) {
      status = "complete";
    } else if (!allPriorComplete) {
      status = "blocked";
    } else {
      status = "in-progress";
    }

    return {
      id: def.id,
      label: def.label,
      status,
      artifact: def.artifact ?? null,
    };
  });
}

// ── Component ───────────────────────────────────────────────────────────

interface PipelineProps {
  feature: Feature;
  onPhaseClick?: (phase: PipelinePhaseInfo) => void;
}

export function Pipeline({ feature, onPhaseClick }: PipelineProps) {
  const phases = derivePhases(feature);

  return (
    <div className="flex items-start justify-center gap-0">
      {phases.map((phase, idx) => (
        <div key={phase.id} className="flex items-start">
          <PipelinePhase phase={phase} onClick={onPhaseClick} />
          {idx < phases.length - 1 && (
            <PipelineConnector
              active={phase.status === "complete"}
              blocked={phases[idx + 1].status === "blocked"}
            />
          )}
        </div>
      ))}
    </div>
  );
}
