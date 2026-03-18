"use client";

import { useDraggable } from "@dnd-kit/core";
import type { Task, Priority } from "../../types";

// ── Priority Config ────────────────────────────────────────────────────

const priorityStyles: Record<Priority, { bg: string; text: string }> = {
  P1: { bg: "bg-red-100", text: "text-red-800" },
  P2: { bg: "bg-amber-100", text: "text-amber-800" },
  P3: { bg: "bg-green-100", text: "text-green-800" },
};

// ── Types ──────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task;
  isBlocked?: boolean;
  blockedReasons?: string[];
  /** Optional ref callback for dependency overlay positioning. */
  onCardRef?: (taskId: string, element: HTMLDivElement | null) => void;
}

// ── Component ──────────────────────────────────────────────────────────

export function TaskCard({
  task,
  isBlocked = false,
  blockedReasons = [],
  onCardRef,
}: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: task.id,
    data: { task },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const pStyle = priorityStyles[task.priority];

  return (
    <div
      ref={(el) => {
        setNodeRef(el);
        onCardRef?.(task.id, el);
      }}
      style={style}
      className={`rounded-lg border p-3 shadow-sm transition-shadow ${
        isDragging
          ? "z-50 border-accent-8 bg-white shadow-lg opacity-90"
          : isBlocked
            ? "border-red-300 bg-red-50"
            : "border-gray-6 bg-white hover:shadow-md"
      }`}
      {...listeners}
      {...attributes}
    >
      {/* Header row: ID badge + Priority + Parallel marker */}
      <div className="flex items-center gap-2">
        <span className="rounded bg-gray-3 px-1.5 py-0.5 font-mono text-xs font-bold text-gray-11">
          {task.id}
        </span>
        <span
          className={`rounded px-1.5 py-0.5 text-xs font-medium ${pStyle.bg} ${pStyle.text}`}
        >
          {task.priority}
        </span>
        {task.isParallel && (
          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800">
            [P]
          </span>
        )}
        {isBlocked && (
          <svg
            className="ml-auto h-4 w-4 text-red-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-label="Blocked"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
            />
          </svg>
        )}
      </div>

      {/* Description */}
      <p className="mt-2 text-sm text-gray-12 line-clamp-3">
        {task.description}
      </p>

      {/* User story label */}
      {task.userStoryRef && (
        <div className="mt-2">
          <span className="rounded-full bg-accent-3 px-2 py-0.5 text-xs font-medium text-accent-11">
            {task.userStoryRef}
          </span>
        </div>
      )}

      {/* Dependency indicators */}
      {task.dependencies.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.dependencies.map((depId) => (
            <span
              key={depId}
              className="rounded bg-gray-3 px-1.5 py-0.5 text-xs text-gray-9"
              title={`Depends on ${depId}`}
            >
              &rarr; {depId}
            </span>
          ))}
        </div>
      )}

      {/* Blocked reasons tooltip */}
      {isBlocked && blockedReasons.length > 0 && (
        <div className="mt-2 rounded border border-red-200 bg-red-50 px-2 py-1.5">
          <p className="text-xs font-medium text-red-700">
            Blocked by:
          </p>
          <ul className="mt-0.5 space-y-0.5">
            {blockedReasons.map((reason, i) => (
              <li key={i} className="text-xs text-red-600">
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Drag Overlay Card (non-interactive) ────────────────────────────────

export function TaskCardOverlay({ task }: { task: Task }) {
  const pStyle = priorityStyles[task.priority];

  return (
    <div className="w-72 rounded-lg border border-accent-8 bg-white p-3 shadow-xl">
      <div className="flex items-center gap-2">
        <span className="rounded bg-gray-3 px-1.5 py-0.5 font-mono text-xs font-bold text-gray-11">
          {task.id}
        </span>
        <span
          className={`rounded px-1.5 py-0.5 text-xs font-medium ${pStyle.bg} ${pStyle.text}`}
        >
          {task.priority}
        </span>
        {task.isParallel && (
          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800">
            [P]
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-gray-12 line-clamp-2">
        {task.description}
      </p>
    </div>
  );
}
