"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  useFeatureStore,
  useBackend,
  DashboardStats,
  RecentActivity,
  ConstitutionSummary,
  FeatureList,
  NewFeatureDialog,
  LoadingSpinner,
  ErrorBoundary,
} from "@spec-intelligence/ui";
import type { Constitution } from "@spec-intelligence/ui";

function DashboardContent() {
  const router = useRouter();
  const backend = useBackend();
  const {
    features,
    loading,
    error,
    loadFeatures,
    createFeature,
  } = useFeatureStore();

  const [constitution, setConstitution] = useState<Constitution | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Load features and constitution on mount
  useEffect(() => {
    loadFeatures(backend);
    backend.getConstitution().then(setConstitution).catch(() => {
      // Constitution may not exist, which is fine
    });
  }, [backend, loadFeatures]);

  const handleCreate = useCallback(
    async (description: string, shortName?: string) => {
      setCreating(true);
      try {
        const result = await createFeature(backend, description, shortName);
        setDialogOpen(false);
        router.push(`/features/${result.feature.slug}/spec`);
      } catch {
        // Error is set in the store
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
          <h1 className="text-2xl font-bold text-gray-12">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-9">
            Overview of your project specifications.
          </p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="spec-button-primary"
        >
          + New Feature
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="mt-12 flex justify-center">
          <LoadingSpinner size="lg" label="Loading dashboard..." />
        </div>
      )}

      {!loading && (
        <div className="mt-6 space-y-6">
          {/* Stats row */}
          <DashboardStats features={features} />

          {/* Two-column layout: Features + Recent Activity */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <FeatureList
                features={features}
                onSelect={(slug) => router.push(`/features/${slug}/spec`)}
                onCreateNew={() => setDialogOpen(true)}
              />
            </div>
            <div>
              <RecentActivity features={features} />
            </div>
          </div>

          {/* Constitution summary */}
          <ConstitutionSummary constitution={constitution} />
        </div>
      )}

      {/* New Feature Dialog */}
      <NewFeatureDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreate}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ErrorBoundary>
      <DashboardContent />
    </ErrorBoundary>
  );
}
