"use client";

import { useMemo } from "react";
import type { Checklist } from "../../types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ChecklistViewerProps {
  checklist: Checklist;
  onToggle: (categoryIndex: number, itemIndex: number) => void;
}

// ---------------------------------------------------------------------------
// Progress helpers
// ---------------------------------------------------------------------------

function computeProgress(total: number, completed: number) {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChecklistViewer({ checklist, onToggle }: ChecklistViewerProps) {
  // Compute overall progress
  const overall = useMemo(() => {
    let total = 0;
    let completed = 0;
    for (const category of checklist.categories) {
      for (const item of category.items) {
        total++;
        if (item.isComplete) completed++;
      }
    }
    return { total, completed, percent: computeProgress(total, completed) };
  }, [checklist]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-12">
          {checklist.name}
        </h3>
        {checklist.purpose && (
          <p className="mt-1 text-sm text-gray-9">{checklist.purpose}</p>
        )}
      </div>

      {/* Overall progress */}
      <div className="rounded-lg border border-gray-6 bg-gray-2 px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-11">Overall Progress</span>
          <span className="text-gray-9">
            {overall.completed} / {overall.total} ({overall.percent}%)
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-4">
          <div
            className="h-full rounded-full bg-accent-9 transition-all duration-300"
            style={{ width: `${overall.percent}%` }}
          />
        </div>
      </div>

      {/* Categories */}
      {checklist.categories.map((category, catIdx) => {
        const catCompleted = category.items.filter((i) => i.isComplete).length;
        const catTotal = category.items.length;
        const catPercent = computeProgress(catTotal, catCompleted);

        return (
          <div key={category.name} className="space-y-3">
            {/* Category header */}
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-12">
                {category.name}
              </h4>
              <span className="text-xs text-gray-9">
                {catCompleted}/{catTotal}
              </span>
            </div>

            {/* Category progress bar */}
            <div className="h-1.5 overflow-hidden rounded-full bg-gray-4">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  catPercent === 100 ? "bg-green-600" : "bg-accent-9"
                }`}
                style={{ width: `${catPercent}%` }}
              />
            </div>

            {/* Items */}
            <ul className="space-y-1">
              {category.items.map((item, itemIdx) => (
                <li key={itemIdx}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-gray-2">
                    <input
                      type="checkbox"
                      checked={item.isComplete}
                      onChange={() => onToggle(catIdx, itemIdx)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-6 text-accent-9 focus:ring-accent-8"
                    />
                    <span
                      className={
                        item.isComplete
                          ? "text-gray-9 line-through"
                          : "text-gray-12"
                      }
                    >
                      {item.description}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
