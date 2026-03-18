"use client";

import type { FeatureStatus } from "../../types";

const statusConfig: Record<
  FeatureStatus,
  { label: string; className: string }
> = {
  Draft: {
    label: "Draft",
    className: "bg-gray-3 text-gray-11 border-gray-7",
  },
  Clarifying: {
    label: "Clarifying",
    className: "bg-amber-100 text-amber-800 border-amber-300",
  },
  Planned: {
    label: "Planned",
    className: "bg-blue-100 text-blue-800 border-blue-300",
  },
  InProgress: {
    label: "In Progress",
    className: "bg-purple-100 text-purple-800 border-purple-300",
  },
  Complete: {
    label: "Complete",
    className: "bg-green-100 text-green-800 border-green-300",
  },
};

interface StatusBadgeProps {
  status: FeatureStatus;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}
