"use client";

import type { Clarification } from "../../types";

// ── Helpers ─────────────────────────────────────────────────────────────

/**
 * Group clarifications by session date.
 */
function groupByDate(
  clarifications: Clarification[],
): Record<string, Clarification[]> {
  const groups: Record<string, Clarification[]> = {};

  for (const c of clarifications) {
    const key = c.sessionDate || "Unknown date";
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(c);
  }

  return groups;
}

/**
 * Format a date string for display.
 */
function formatSessionDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// ── Component ───────────────────────────────────────────────────────────

interface ClarificationHistoryProps {
  clarifications: Clarification[];
}

export function ClarificationHistory({
  clarifications,
}: ClarificationHistoryProps) {
  if (clarifications.length === 0) {
    return (
      <div className="rounded-lg border border-gray-6 bg-gray-2 px-4 py-6 text-center">
        <p className="text-sm text-gray-9">
          No resolved clarifications yet.
        </p>
      </div>
    );
  }

  const grouped = groupByDate(clarifications);
  const dates = Object.keys(grouped).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  );

  return (
    <div className="space-y-6">
      {dates.map((date) => (
        <div key={date}>
          {/* Session date header */}
          <div className="flex items-center gap-2">
            <span className="h-px flex-1 bg-gray-6" />
            <span className="shrink-0 text-xs font-medium text-gray-9">
              {formatSessionDate(date)}
            </span>
            <span className="h-px flex-1 bg-gray-6" />
          </div>

          {/* Q&A list */}
          <div className="mt-3 space-y-3">
            {grouped[date].map((item, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-gray-6 bg-gray-1 px-4 py-3"
              >
                {/* Question */}
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-800">
                    Q
                  </span>
                  <p className="text-sm text-gray-12">{item.question}</p>
                </div>

                {/* Arrow */}
                <div className="ml-2.5 border-l-2 border-gray-4 py-1" />

                {/* Answer */}
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-800">
                    A
                  </span>
                  <p className="text-sm text-gray-11">{item.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
