"use client";

import { useState, useMemo } from "react";
import type { Feature, FeatureStatus } from "../../types";
import { FeatureCard } from "./FeatureCard";
import { SearchInput } from "../common/SearchInput";
import { EmptyState } from "../common/EmptyState";

type SortOption = "number" | "name" | "status" | "created";

const STATUS_OPTIONS: Array<{ value: FeatureStatus | "All"; label: string }> = [
  { value: "All", label: "All Statuses" },
  { value: "Draft", label: "Draft" },
  { value: "Clarifying", label: "Clarifying" },
  { value: "Planned", label: "Planned" },
  { value: "InProgress", label: "In Progress" },
  { value: "Complete", label: "Complete" },
];

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "number", label: "Number" },
  { value: "name", label: "Name" },
  { value: "status", label: "Status" },
  { value: "created", label: "Created" },
];

const statusOrder: Record<FeatureStatus, number> = {
  Draft: 0,
  Clarifying: 1,
  Planned: 2,
  InProgress: 3,
  Complete: 4,
};

interface FeatureListProps {
  features: Feature[];
  onSelect: (slug: string) => void;
  onCreateNew: () => void;
}

export function FeatureList({
  features,
  onSelect,
  onCreateNew,
}: FeatureListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FeatureStatus | "All">(
    "All",
  );
  const [sortBy, setSortBy] = useState<SortOption>("number");

  const filteredFeatures = useMemo(() => {
    let result = features;

    // Filter by status
    if (statusFilter !== "All") {
      result = result.filter((f) => f.status === statusFilter);
    }

    // Filter by search query
    if (search.trim()) {
      const query = search.toLowerCase().trim();
      result = result.filter(
        (f) =>
          f.shortName.toLowerCase().includes(query) ||
          f.slug.toLowerCase().includes(query) ||
          f.number.includes(query),
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "number":
          return a.number.localeCompare(b.number);
        case "name":
          return a.shortName.localeCompare(b.shortName);
        case "status":
          return statusOrder[a.status] - statusOrder[b.status];
        case "created":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        default:
          return 0;
      }
    });

    return result;
  }, [features, search, statusFilter, sortBy]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-12">Features</h2>
          <span className="inline-flex items-center rounded-full bg-gray-3 px-2 py-0.5 text-xs font-medium text-gray-11">
            {features.length}
          </span>
        </div>
        <button onClick={onCreateNew} className="spec-button-primary">
          <svg
            className="mr-1.5 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          New Feature
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search features..."
          className="flex-1"
        />

        <div className="flex gap-2">
          {/* Status filter dropdown */}
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as FeatureStatus | "All")
            }
            className="spec-input min-w-[140px]"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Sort dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="spec-input min-w-[120px]"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                Sort: {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Feature Grid */}
      {filteredFeatures.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredFeatures.map((feature) => (
            <FeatureCard
              key={feature.slug}
              feature={feature}
              onClick={() => onSelect(feature.slug)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title={
            search || statusFilter !== "All"
              ? "No features match your filters"
              : "No features yet"
          }
          description={
            search || statusFilter !== "All"
              ? "Try adjusting your search or filter criteria."
              : "Create your first feature specification to get started."
          }
          action={
            !search && statusFilter === "All"
              ? { label: "Create Feature", onClick: onCreateNew }
              : undefined
          }
          icon={
            <svg
              className="h-10 w-10"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
              />
            </svg>
          }
        />
      )}
    </div>
  );
}
