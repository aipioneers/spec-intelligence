"use client";

import { useState, useCallback, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { Task, TaskStatus } from "../../types";
import { KanbanColumn } from "./KanbanColumn";
import { TaskCardOverlay } from "./TaskCard";
import { DependencyOverlay } from "./DependencyOverlay";

// ── Status columns order ───────────────────────────────────────────────

const COLUMNS: TaskStatus[] = ["Todo", "InProgress", "Done", "Blocked"];

// ── Types ──────────────────────────────────────────────────────────────

interface KanbanBoardProps {
  tasksByStatus: Record<TaskStatus, Task[]>;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  isTaskBlocked?: (taskId: string) => boolean;
  getBlockedReasons?: (taskId: string) => string[];
  allTasks?: Task[];
}

// ── Component ──────────────────────────────────────────────────────────

export function KanbanBoard({
  tasksByStatus,
  onStatusChange,
  isTaskBlocked,
  getBlockedReasons,
  allTasks = [],
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Sensors configuration
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  // ── Drag handlers ────────────────────────────────────────────────────

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = event.active.data.current?.task as Task | undefined;
    if (task) {
      setActiveTask(task);
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);

      if (!over) return;

      const taskId = active.id as string;
      const overId = over.id as string;

      // Extract the status from the column drop target
      let newStatus: TaskStatus | null = null;

      if (overId.startsWith("column-")) {
        newStatus = overId.replace("column-", "") as TaskStatus;
      } else {
        // Dropped on another task — find which column that task is in
        const overData = over.data.current;
        if (overData?.task) {
          newStatus = (overData.task as Task).status;
        }
      }

      if (newStatus) {
        onStatusChange(taskId, newStatus);
      }
    },
    [onStatusChange],
  );

  // ── Card ref callback ────────────────────────────────────────────────

  const handleCardRef = useCallback(
    (taskId: string, element: HTMLDivElement | null) => {
      cardRefs.current[taskId] = element;
    },
    [],
  );

  return (
    <div className="relative">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Columns */}
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={tasksByStatus[status] ?? []}
              isTaskBlocked={isTaskBlocked}
              getBlockedReasons={getBlockedReasons}
              onCardRef={handleCardRef}
            />
          ))}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeTask ? <TaskCardOverlay task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Dependency Overlay */}
      {allTasks.length > 0 && (
        <DependencyOverlay
          tasks={allTasks}
          cardRefs={cardRefs.current}
        />
      )}
    </div>
  );
}
