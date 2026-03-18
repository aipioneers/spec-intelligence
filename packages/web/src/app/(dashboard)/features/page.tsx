"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  useFeatureStore,
  useBackend,
  SearchInput,
  EmptyState,
  LoadingSpinner,
  ErrorBoundary,
  FeatureCard,
  StatusBadge,
  BoardView,
} from "@spec-intelligence/ui";
import type { FeatureStatus } from "@spec-intelligence/ui";

// ---------------------------------------------------------------------------
// Status filter tabs
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: { label: string; value: FeatureStatus | null }[] = [
  { label: "All", value: null },
  { label: "Draft", value: "Draft" },
  { label: "Clarifying", value: "Clarifying" },
  { label: "Planned", value: "Planned" },
  { label: "In Progress", value: "InProgress" },
  { label: "Complete", value: "Complete" },
];

// ---------------------------------------------------------------------------
// New Feature Dialog
// ---------------------------------------------------------------------------

function NewFeatureDialog({
  open,
  onClose,
  onSubmit,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (description: string, shortName?: string) => void;
  loading: boolean;
}) {
  const [description, setDescription] = useState("");
  const [shortName, setShortName] = useState("");

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    onSubmit(description.trim(), shortName.trim() || undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Dialog */}
      <div className="relative z-10 w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-gray-12">New Feature</h2>
        <p className="mt-1 text-sm text-gray-9">
          Describe the feature you want to create. A specification will be
          generated automatically.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-11"
            >
              Description *
            </label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this feature should do..."
              className="spec-input mt-1 w-full"
              required
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor="shortName"
              className="block text-sm font-medium text-gray-11"
            >
              Short name{" "}
              <span className="text-gray-9">(optional, auto-generated)</span>
            </label>
            <input
              id="shortName"
              type="text"
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              placeholder="e.g., user-auth"
              className="spec-input mt-1 w-full"
              pattern="[a-z0-9-]*"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-medium text-gray-11 hover:bg-gray-3"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !description.trim()}
              className="spec-button-primary"
            >
              {loading ? "Creating..." : "Create Feature"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// View Toggle
// ---------------------------------------------------------------------------

function ViewToggle({
  viewMode,
  onToggle,
}: {
  viewMode: 'list' | 'board';
  onToggle: (mode: 'list' | 'board') => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg bg-gray-2 p-1">
      <button
        onClick={() => onToggle('list')}
        className={`rounded-md p-1.5 transition-colors ${
          viewMode === 'list'
            ? 'bg-white text-gray-12 shadow-sm'
            : 'text-gray-9 hover:text-gray-11'
        }`}
        title="List view"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
      </button>
      <button
        onClick={() => onToggle('board')}
        className={`rounded-md p-1.5 transition-colors ${
          viewMode === 'board'
            ? 'bg-white text-gray-12 shadow-sm'
            : 'text-gray-9 hover:text-gray-11'
        }`}
        title="Board view"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feature List Page
// ---------------------------------------------------------------------------

function FeatureListContent() {
  const router = useRouter();
  const backend = useBackend();
  const {
    loading,
    error,
    searchQuery,
    statusFilter,
    sortBy,
    viewMode,
    groupBy,
    loadFeatures,
    loadAllFeatures,
    setSearchQuery,
    setStatusFilter,
    setSortBy,
    setViewMode,
    setGroupBy,
    filteredFeatures,
    createFeature,
  } = useFeatureStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Load features on mount
  useEffect(() => {
    if (viewMode === 'board') {
      loadAllFeatures(backend);
    } else {
      loadFeatures(backend);
    }
  }, [backend, viewMode, loadFeatures, loadAllFeatures]);

  const features = filteredFeatures();

  const handleCreate = useCallback(
    async (description: string, shortName?: string) => {
      setCreating(true);
      try {
        const result = await createFeature(backend, description, shortName);
        setDialogOpen(false);
        router.push(`/features/${result.feature.slug}/spec`);
      } catch {
        // Error is already set in the store
      } finally {
        setCreating(false);
      }
    },
    [backend, createFeature, router],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-12">Features</h1>
          <p className="mt-1 text-sm text-gray-9">
            Manage your project specifications and feature pipeline.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle viewMode={viewMode} onToggle={setViewMode} />
          <button
            onClick={() => setDialogOpen(true)}
            className="spec-button-primary"
          >
            + New Feature
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search features..."
          className="sm:max-w-xs"
        />

        <div className="flex items-center gap-2">
          {/* Status filter tabs */}
          <div className="flex gap-1 rounded-lg bg-gray-2 p-1">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                onClick={() => setStatusFilter(opt.value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === opt.value
                    ? "bg-white text-gray-12 shadow-sm"
                    : "text-gray-9 hover:text-gray-11"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Sort selector */}
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(
                e.target.value as "number" | "name" | "status" | "created",
              )
            }
            className="spec-input text-xs"
            aria-label="Sort features by"
          >
            <option value="number">Sort by Number</option>
            <option value="name">Sort by Name</option>
            <option value="status">Sort by Status</option>
            <option value="created">Sort by Created</option>
          </select>
        </div>
      </div>

      {viewMode === 'board' && (
        <div className="mt-4 flex">
          <div className="flex gap-1 rounded-lg bg-gray-2 p-1">
            <button
              onClick={() => setGroupBy('status')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                groupBy === 'status'
                  ? 'bg-white text-gray-12 shadow-sm'
                  : 'text-gray-9 hover:text-gray-11'
              }`}
            >
              By Status
            </button>
            <button
              onClick={() => setGroupBy('project')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                groupBy === 'project'
                  ? 'bg-white text-gray-12 shadow-sm'
                  : 'text-gray-9 hover:text-gray-11'
              }`}
            >
              By Project
            </button>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="mt-12 flex justify-center">
          <LoadingSpinner size="lg" label="Loading features..." />
        </div>
      )}

      {/* Empty state */}
      {!loading && features.length === 0 && (
        <div className="mt-12">
          <EmptyState
            title={searchQuery || statusFilter ? "No matching features" : "No features yet"}
            description={
              searchQuery || statusFilter
                ? "Try adjusting your search or filters."
                : "Create your first feature to get started with the specification pipeline."
            }
            action={
              !searchQuery && !statusFilter
                ? {
                    label: "Create Feature",
                    onClick: () => setDialogOpen(true),
                  }
                : undefined
            }
            icon={
              <svg
                className="h-12 w-12"
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
        </div>
      )}

      {/* Feature grid */}
      {!loading && features.length > 0 && (
        <div className="mt-6">
          {viewMode === 'board' ? (
            <BoardView
              features={features}
              groupBy={groupBy}
              onFeatureClick={(f) => router.push(`/features/${f.slug}`)}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <FeatureCard
                  key={feature.slug}
                  feature={feature}
                  onClick={() => router.push(`/features/${feature.slug}/spec`)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Feature Dialog */}
      <NewFeatureDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleCreate}
        loading={creating}
      />
    </div>
  );
}

export default function FeaturesPage() {
  return (
    <ErrorBoundary>
      <FeatureListContent />
    </ErrorBoundary>
  );
}
