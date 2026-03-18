"use client";

import { useEffect, useState, useCallback } from "react";
import {
  PresetBrowser,
  LoadingSpinner,
  ErrorBoundary,
} from "@spec-intelligence/ui";
import type { Preset } from "@spec-intelligence/ui";

function PresetSettingsContent() {
  const [installed, setInstalled] = useState<Preset[]>([]);
  const [available, setAvailable] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPresets = useCallback(async () => {
    try {
      const res = await fetch("/api/presets");
      if (!res.ok) throw new Error("Failed to load presets");
      const data = await res.json();
      setInstalled(data.installed ?? []);
      setAvailable(data.available ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load presets",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  const handleInstall = useCallback(
    async (id: string) => {
      try {
        const res = await fetch("/api/presets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        if (!res.ok) throw new Error("Failed to install preset");
        await loadPresets();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to install preset",
        );
      }
    },
    [loadPresets],
  );

  const handleRemove = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/presets?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to remove preset");
        await loadPresets();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to remove preset",
        );
      }
    },
    [loadPresets],
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" label="Loading presets..." />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-12">Presets</h1>
        <p className="mt-1 text-sm text-gray-9">
          Browse and install template presets for different project types.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <PresetBrowser
        installedPresets={installed}
        availablePresets={available}
        onInstall={handleInstall}
        onRemove={handleRemove}
      />
    </div>
  );
}

export default function PresetSettingsPage() {
  return (
    <ErrorBoundary>
      <PresetSettingsContent />
    </ErrorBoundary>
  );
}
