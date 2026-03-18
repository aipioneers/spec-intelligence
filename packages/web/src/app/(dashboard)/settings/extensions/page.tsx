"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ExtensionBrowser,
  LoadingSpinner,
  ErrorBoundary,
} from "@spec-intelligence/ui";
import type { Extension } from "@spec-intelligence/ui";

function ExtensionSettingsContent() {
  const [installed, setInstalled] = useState<Extension[]>([]);
  const [available, setAvailable] = useState<Extension[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadExtensions = useCallback(async () => {
    try {
      const res = await fetch("/api/extensions");
      if (!res.ok) throw new Error("Failed to load extensions");
      const data = await res.json();
      setInstalled(data.installed ?? []);
      setAvailable(data.available ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load extensions",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExtensions();
  }, [loadExtensions]);

  const handleInstall = useCallback(
    async (id: string) => {
      try {
        const res = await fetch("/api/extensions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        if (!res.ok) throw new Error("Failed to install extension");
        await loadExtensions();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to install extension",
        );
      }
    },
    [loadExtensions],
  );

  const handleRemove = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/extensions?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to remove extension");
        await loadExtensions();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to remove extension",
        );
      }
    },
    [loadExtensions],
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" label="Loading extensions..." />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-12">Extensions</h1>
        <p className="mt-1 text-sm text-gray-9">
          Browse, install, and manage extensions that add new capabilities to
          Spec Intelligence.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <ExtensionBrowser
        installedExtensions={installed}
        availableExtensions={available}
        onInstall={handleInstall}
        onRemove={handleRemove}
      />
    </div>
  );
}

export default function ExtensionSettingsPage() {
  return (
    <ErrorBoundary>
      <ExtensionSettingsContent />
    </ErrorBoundary>
  );
}
