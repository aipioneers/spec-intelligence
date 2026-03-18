"use client";

import type { Feature, FeatureStatus } from "../../types";

interface DashboardStatsProps {
  features: Feature[];
}

interface StatCard {
  label: string;
  count: number;
  icon: React.ReactNode;
  bgColor: string;
  iconColor: string;
  textColor: string;
}

export function DashboardStats({ features }: DashboardStatsProps) {
  const counts: Record<string, number> = {
    total: features.length,
    draft: features.filter((f) => f.status === "Draft" || f.status === "Clarifying").length,
    inProgress: features.filter((f) => f.status === "InProgress" || f.status === "Planned").length,
    complete: features.filter((f) => f.status === "Complete").length,
  };

  const stats: StatCard[] = [
    {
      label: "Total Features",
      count: counts.total,
      bgColor: "bg-gray-3",
      iconColor: "text-gray-11",
      textColor: "text-gray-12",
      icon: (
        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
        </svg>
      ),
    },
    {
      label: "Draft",
      count: counts.draft,
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
      textColor: "text-blue-700",
      icon: (
        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
        </svg>
      ),
    },
    {
      label: "In Progress",
      count: counts.inProgress,
      bgColor: "bg-amber-50",
      iconColor: "text-amber-600",
      textColor: "text-amber-700",
      icon: (
        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
    },
    {
      label: "Complete",
      count: counts.complete,
      bgColor: "bg-green-50",
      iconColor: "text-green-600",
      textColor: "text-green-700",
      icon: (
        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="spec-card flex items-center gap-4"
        >
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bgColor} ${stat.iconColor}`}>
            {stat.icon}
          </div>
          <div>
            <p className={`text-2xl font-bold ${stat.textColor}`}>
              {stat.count}
            </p>
            <p className="text-xs text-gray-9">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
