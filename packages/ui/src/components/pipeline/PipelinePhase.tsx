"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import type { PipelinePhaseInfo } from "../../types";

// ── Status icon SVGs ────────────────────────────────────────────────────

function NotStartedIcon() {
  return (
    <svg
      className="h-4 w-4 text-gray-7"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

function InProgressIcon() {
  return (
    <svg
      className="h-4 w-4 animate-pulse text-blue-500"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  );
}

function CompleteIcon() {
  return (
    <svg
      className="h-4 w-4 text-green-600"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  );
}

function BlockedIcon() {
  return (
    <svg
      className="h-4 w-4 text-red-500"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
      />
    </svg>
  );
}

// ── Status style map ────────────────────────────────────────────────────

const statusStyles: Record<
  PipelinePhaseInfo["status"],
  { ring: string; bg: string; icon: React.ReactNode }
> = {
  "not-started": {
    ring: "ring-gray-6",
    bg: "bg-gray-2",
    icon: <NotStartedIcon />,
  },
  "in-progress": {
    ring: "ring-blue-400 ring-2",
    bg: "bg-blue-50",
    icon: <InProgressIcon />,
  },
  complete: {
    ring: "ring-green-400 ring-2",
    bg: "bg-green-50",
    icon: <CompleteIcon />,
  },
  blocked: {
    ring: "ring-red-300",
    bg: "bg-red-50",
    icon: <BlockedIcon />,
  },
};

const statusLabels: Record<PipelinePhaseInfo["status"], string> = {
  "not-started": "Not started",
  "in-progress": "In progress",
  complete: "Complete",
  blocked: "Blocked",
};

// ── Component ───────────────────────────────────────────────────────────

interface PipelinePhaseProps {
  phase: PipelinePhaseInfo;
  onClick?: (phase: PipelinePhaseInfo) => void;
}

export function PipelinePhase({ phase, onClick }: PipelinePhaseProps) {
  const style = statusStyles[phase.status];

  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            onClick={() => onClick?.(phase)}
            className="flex flex-col items-center gap-1.5 focus:outline-none"
            aria-label={`${phase.label}: ${statusLabels[phase.status]}`}
          >
            {/* Circular indicator */}
            <span
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full ring-1 transition-all ${style.ring} ${style.bg} ${
                phase.status !== "blocked"
                  ? "cursor-pointer hover:shadow-md"
                  : "cursor-not-allowed opacity-70"
              }`}
            >
              {style.icon}
            </span>

            {/* Label */}
            <span
              className={`text-xs font-medium ${
                phase.status === "in-progress"
                  ? "text-blue-700"
                  : phase.status === "complete"
                    ? "text-green-700"
                    : phase.status === "blocked"
                      ? "text-red-500"
                      : "text-gray-9"
              }`}
            >
              {phase.label}
            </span>
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            sideOffset={6}
            className="rounded-md bg-gray-12 px-2.5 py-1.5 text-xs text-gray-1 shadow-md"
          >
            {phase.label}: {statusLabels[phase.status]}
            {phase.artifact && (
              <span className="ml-1 text-gray-5">({phase.artifact})</span>
            )}
            <Tooltip.Arrow className="fill-gray-12" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
