"use client";

import type { Feature } from "../../types";

interface RecentActivityProps {
  features: Feature[];
}

interface ActivityItem {
  featureName: string;
  featureNumber: string;
  action: string;
  timestamp: string;
}

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMinutes < 1) return "just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

function deriveActionLabel(feature: Feature): string {
  switch (feature.status) {
    case "Complete":
      return "marked complete";
    case "InProgress":
      return "moved to in progress";
    case "Planned":
      return "plan created";
    case "Clarifying":
      return "needs clarification";
    case "Draft":
    default:
      return "created";
  }
}

function deriveActivities(features: Feature[]): ActivityItem[] {
  return features
    .filter((f) => f.createdAt)
    .map((f) => ({
      featureName: f.shortName
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
      featureNumber: f.number,
      action: deriveActionLabel(f),
      timestamp: f.createdAt,
    }))
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, 10);
}

const actionColors: Record<string, string> = {
  created: "bg-blue-100 text-blue-700",
  "marked complete": "bg-green-100 text-green-700",
  "moved to in progress": "bg-amber-100 text-amber-700",
  "plan created": "bg-purple-100 text-purple-700",
  "needs clarification": "bg-orange-100 text-orange-700",
};

export function RecentActivity({ features }: RecentActivityProps) {
  const activities = deriveActivities(features);

  if (activities.length === 0) {
    return (
      <div className="spec-card">
        <h3 className="text-sm font-semibold text-gray-12">Recent Activity</h3>
        <p className="mt-3 text-sm text-gray-9">No recent activity yet.</p>
      </div>
    );
  }

  return (
    <div className="spec-card">
      <h3 className="text-sm font-semibold text-gray-12">Recent Activity</h3>
      <div className="mt-3 space-y-3">
        {activities.map((item, i) => (
          <div key={`${item.featureNumber}-${i}`} className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-accent-3 text-[10px] font-bold text-accent-11">
              {item.featureNumber}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-gray-12">
                {item.featureName}
              </p>
              <div className="mt-0.5 flex items-center gap-2">
                <span
                  className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                    actionColors[item.action] ?? "bg-gray-3 text-gray-11"
                  }`}
                >
                  {item.action}
                </span>
                <span className="text-[10px] text-gray-9">
                  {formatRelativeTime(item.timestamp)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
