"use client";

import { useDroppable } from "@dnd-kit/core";
import type { Task, TaskStatus } from "../../types";
import { TaskCard } from "./TaskCard";

// ── Status display config ──────────────────────────────────────────────

const statusConfig: Record<
  TaskStatus,
  { label: string; headerBg: string; headerText: string; borderColor: string }
> = {
  Todo: {
    label: "Todo",
    headerBg: "bg-gray-3",
    headerText: "text-gray-11",
    borderColor: "border-gray-6",
  },
  InProgress: {
    label: "In Progress",
    headerBg: "bg-blue-50",
    headerText: "text-blue-800",
    borderColor: "border-blue-200",
  },
  Done: {
    label: "Done",
    headerBg: "bg-green-50",
    headerText: "text-green-800",
    borderColor: "border-green-200",
  },
  Blocked: {
    label: "Blocked",
    headerBg: "bg-red-50",
    headerText: "text-red-800",
    borderColor: "border-red-200",
  },
};

// ── Types ──────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  /** Callback to check if a task is blocked by dependencies. */
  isTaskBlocked?: (taskId: string) => boolean;
  /** Callback to get blocked reasons for a task. */
  getBlockedReasons?: (taskId: string) => string[];
  /** Optional ref callback for dependency overlay positioning. */
  onCardRef?: (taskId: string, element: HTMLDivElement | null) => void;
}

// ── Component ──────────────────────────────────────────────────────────

export function KanbanColumn({
  status,
  tasks,
  isTaskBlocked,
  getBlockedReasons,
  onCardRef,
}: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `column-${status}`,
    data: { status },
  });

  const config = statusConfig[status];

  return (
    <div
      className={`flex min-h-[200px] w-72 flex-shrink-0 flex-col rounded-lg border ${
        isOver ? "border-accent-8 ring-2 ring-accent-4" : config.borderColor
      } bg-gray-1`}
    >
      {/* Column Header */}
      <div
        className={`flex items-center justify-between rounded-t-lg px-3 py-2.5 ${config.headerBg}`}
      >
        <span className={`text-sm font-semibold ${config.headerText}`}>
          {config.label}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${config.headerText} bg-white/60`}
        >
          {tasks.length}
        </span>
      </div>

      {/* Droppable Zone */}
      <div
        ref={setNodeRef}
        className={`flex flex-1 flex-col gap-2 p-2 transition-colors ${
          isOver ? "bg-accent-2" : ""
        }`}
      >
        {tasks.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-gray-6 py-8">
            <span className="text-xs text-gray-8">
              Drop tasks here
            </span>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isBlocked={isTaskBlocked?.(task.id) ?? false}
              blockedReasons={getBlockedReasons?.(task.id) ?? []}
              onCardRef={onCardRef}
            />
          ))
        )}
      </div>
    </div>
  );
}
