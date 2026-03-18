"use client";

import { useEffect, useState, useCallback } from "react";
import {
  useBackend,
  ConstitutionEditor,
  LoadingSpinner,
  ErrorBoundary,
} from "@spec-intelligence/ui";
import type { Constitution } from "@spec-intelligence/ui";

const EMPTY_CONSTITUTION: Constitution = {
  principles: [],
  constraints: [],
  developmentGuidelines: [],
  version: "1.0.0",
  lastAmended: new Date().toISOString().split("T")[0],
};

function ConstitutionSettingsContent() {
  const backend = useBackend();
  const [constitution, setConstitution] = useState<Constitution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    backend
      .getConstitution()
      .then((c) => {
        setConstitution(c ?? EMPTY_CONSTITUTION);
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Failed to load constitution",
        );
        setConstitution(EMPTY_CONSTITUTION);
      })
      .finally(() => setLoading(false));
  }, [backend]);

  const handleSave = useCallback(
    async (updated: Constitution) => {
      const result = await backend.updateConstitution(updated);
      setConstitution(result);
    },
    [backend],
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" label="Loading constitution..." />
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb detail */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-12">Constitution</h1>
        <p className="mt-1 text-sm text-gray-9">
          Define the core principles, constraints, and development guidelines
          for your project.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {constitution && (
        <ConstitutionEditor
          constitution={constitution}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

export default function ConstitutionSettingsPage() {
  return (
    <ErrorBoundary>
      <ConstitutionSettingsContent />
    </ErrorBoundary>
  );
}
