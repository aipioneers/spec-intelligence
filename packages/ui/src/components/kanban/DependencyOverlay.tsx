"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Task } from "../../types";

// ── Types ──────────────────────────────────────────────────────────────

interface DependencyOverlayProps {
  tasks: Task[];
  cardRefs: Record<string, HTMLDivElement | null>;
}

interface ArrowData {
  fromId: string;
  toId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isBlocked: boolean;
}

// ── Component ──────────────────────────────────────────────────────────

export function DependencyOverlay({
  tasks,
  cardRefs,
}: DependencyOverlayProps) {
  const [arrows, setArrows] = useState<ArrowData[]>([]);
  const [hoveredArrow, setHoveredArrow] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Calculate arrow positions ────────────────────────────────────────

  const calculateArrows = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const newArrows: ArrowData[] = [];

    for (const task of tasks) {
      if (task.dependencies.length === 0) continue;

      const toEl = cardRefs[task.id];
      if (!toEl) continue;

      const toRect = toEl.getBoundingClientRect();

      for (const depId of task.dependencies) {
        const fromEl = cardRefs[depId];
        if (!fromEl) continue;

        const fromRect = fromEl.getBoundingClientRect();

        // Check if the dependency is incomplete (task is blocked)
        const depTask = tasks.find((t) => t.id === depId);
        const isBlocked = !depTask || depTask.status !== "Done";

        // Calculate arrow coordinates relative to container
        newArrows.push({
          fromId: depId,
          toId: task.id,
          x1: fromRect.right - containerRect.left,
          y1: fromRect.top + fromRect.height / 2 - containerRect.top,
          x2: toRect.left - containerRect.left,
          y2: toRect.top + toRect.height / 2 - containerRect.top,
          isBlocked,
        });
      }
    }

    setArrows(newArrows);
  }, [tasks, cardRefs]);

  // Recalculate on mount and when tasks/refs change
  useEffect(() => {
    calculateArrows();

    // Recalculate on window resize
    const handleResize = () => calculateArrows();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [calculateArrows]);

  // Recalculate periodically to catch DOM updates
  useEffect(() => {
    const interval = setInterval(calculateArrows, 1000);
    return () => clearInterval(interval);
  }, [calculateArrows]);

  if (arrows.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-10"
    >
      <svg
        className="absolute inset-0 h-full w-full"
        style={{ overflow: "visible" }}
      >
        <defs>
          <marker
            id="arrow-blocked"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
          </marker>
          <marker
            id="arrow-resolved"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#22c55e" />
          </marker>
        </defs>

        {arrows.map((arrow) => {
          const key = `${arrow.fromId}-${arrow.toId}`;
          const isHovered = hoveredArrow === key;

          // Curved path control points
          const dx = arrow.x2 - arrow.x1;
          const controlOffset = Math.min(Math.abs(dx) * 0.4, 60);

          const pathD = `M ${arrow.x1} ${arrow.y1} C ${arrow.x1 + controlOffset} ${arrow.y1}, ${arrow.x2 - controlOffset} ${arrow.y2}, ${arrow.x2} ${arrow.y2}`;

          return (
            <g key={key}>
              {/* Invisible wider path for hover detection */}
              <path
                d={pathD}
                fill="none"
                stroke="transparent"
                strokeWidth={16}
                className="pointer-events-auto cursor-help"
                onMouseEnter={() => setHoveredArrow(key)}
                onMouseLeave={() => setHoveredArrow(null)}
              />
              {/* Visible arrow */}
              <path
                d={pathD}
                fill="none"
                stroke={
                  arrow.isBlocked
                    ? isHovered
                      ? "#dc2626"
                      : "#ef4444"
                    : isHovered
                      ? "#16a34a"
                      : "#22c55e"
                }
                strokeWidth={isHovered ? 2.5 : 1.5}
                strokeDasharray={arrow.isBlocked ? "6,3" : undefined}
                markerEnd={`url(#${arrow.isBlocked ? "arrow-blocked" : "arrow-resolved"})`}
                opacity={isHovered ? 1 : 0.6}
                className="transition-all duration-150"
              />
            </g>
          );
        })}
      </svg>

      {/* Hover tooltip */}
      {hoveredArrow && (() => {
        const arrow = arrows.find(
          (a) => `${a.fromId}-${a.toId}` === hoveredArrow,
        );
        if (!arrow) return null;

        const midX = (arrow.x1 + arrow.x2) / 2;
        const midY = (arrow.y1 + arrow.y2) / 2;

        return (
          <div
            className="pointer-events-none absolute rounded-md bg-gray-12 px-2.5 py-1.5 text-xs text-gray-1 shadow-md"
            style={{
              left: midX,
              top: midY - 30,
              transform: "translateX(-50%)",
            }}
          >
            {arrow.fromId} &rarr; {arrow.toId}
            {arrow.isBlocked && (
              <span className="ml-1 text-red-300">(blocked)</span>
            )}
          </div>
        );
      })()}
    </div>
  );
}
