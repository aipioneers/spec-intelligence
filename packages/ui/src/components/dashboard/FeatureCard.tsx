"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import type { Feature, FeatureStatus } from "../../types";
import { StatusBadge } from "../common/StatusBadge";

interface FeatureCardProps {
  feature: Feature;
  onClick: () => void;
}

const pipelinePhases = [
  { key: "spec", label: "Specify" },
  { key: "clarify", label: "Clarify" },
  { key: "plan", label: "Plan" },
  { key: "tasks", label: "Tasks" },
  { key: "implement", label: "Implement" },
] as const;

function getPipelineCompletion(feature: Feature): boolean[] {
  const status = feature.status;
  switch (status) {
    case "Complete":
      return [true, true, true, true, true];
    case "InProgress":
      return [true, true, true, true, false];
    case "Planned":
      return [true, true, true, false, false];
    case "Clarifying":
      return [true, true, false, false, false];
    case "Draft":
    default:
      return [true, false, false, false, false];
  }
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function FeatureCard({ feature, onClick }: FeatureCardProps) {
  const completion = getPipelineCompletion(feature);

  return (
    <Tooltip.Provider delayDuration={300}>
      <button
        onClick={onClick}
        className="spec-card group w-full cursor-pointer text-left transition-all hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent-8 focus:ring-offset-2"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-accent-3 text-xs font-bold text-accent-11">
              {feature.number}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-medium text-gray-12 group-hover:text-accent-11">
                {feature.shortName
                  .split("-")
                  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(" ")}
              </h3>
            </div>
          </div>
          <StatusBadge status={feature.status} />
        </div>

        <div className="mt-3 flex items-center justify-between">
          {/* Pipeline progress dots */}
          <div className="flex items-center gap-1">
            {pipelinePhases.map((phase, i) => (
              <Tooltip.Root key={phase.key}>
                <Tooltip.Trigger asChild>
                  <span
                    className={`inline-block h-2 w-2 rounded-full transition-colors ${
                      completion[i]
                        ? "bg-green-500"
                        : "bg-gray-6"
                    }`}
                  />
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    side="top"
                    sideOffset={4}
                    className="rounded-md bg-gray-12 px-2 py-1 text-xs text-gray-1 shadow-md"
                  >
                    {phase.label}: {completion[i] ? "Complete" : "Pending"}
                    <Tooltip.Arrow className="fill-gray-12" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            ))}
          </div>

          {/* Creation date */}
          <span className="text-xs text-gray-9">
            {formatDate(feature.createdAt)}
          </span>
        </div>
      </button>
    </Tooltip.Provider>
  );
}
