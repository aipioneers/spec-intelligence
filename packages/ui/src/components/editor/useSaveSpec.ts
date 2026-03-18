"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { Specification } from "../../types";
import type { BackendAdapter } from "../../lib/backend-adapter";

interface UseSaveSpecReturn {
  save: (spec: Specification) => Promise<void>;
  saving: boolean;
  error: string | null;
  lastSaved: Date | null;
  dirty: boolean;
  markDirty: () => void;
  markClean: () => void;
}

const AUTO_SAVE_DELAY_MS = 5000;

/**
 * Custom hook for saving spec data with auto-save, dirty tracking,
 * and ETag conflict handling.
 */
export function useSaveSpec(
  slug: string,
  backend: BackendAdapter,
): UseSaveSpecReturn {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [dirty, setDirty] = useState(false);

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSpecRef = useRef<Specification | null>(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  const save = useCallback(
    async (spec: Specification) => {
      if (saving) return;

      // Clear any pending auto-save
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }

      setSaving(true);
      setError(null);

      try {
        await backend.updateSpec(slug, spec);

        if (mountedRef.current) {
          setLastSaved(new Date());
          setDirty(false);
          pendingSpecRef.current = null;
        }
      } catch (err: unknown) {
        if (!mountedRef.current) return;

        // Handle ETag conflict (409)
        if (
          err instanceof Error &&
          (err.message.includes("409") || err.message.includes("Conflict"))
        ) {
          setError(
            "Conflict detected: the spec was modified elsewhere. Please reload and try again.",
          );
          // Caller should handle showing a conflict notification and reloading
        } else {
          setError(
            err instanceof Error ? err.message : "Failed to save specification",
          );
        }
      } finally {
        if (mountedRef.current) {
          setSaving(false);
        }
      }
    },
    [slug, backend, saving],
  );

  // Debounced auto-save: schedules a save 5 seconds after the last edit
  const scheduleAutoSave = useCallback(
    (spec: Specification) => {
      pendingSpecRef.current = spec;

      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      autoSaveTimerRef.current = setTimeout(() => {
        const pending = pendingSpecRef.current;
        if (pending && mountedRef.current) {
          save(pending);
        }
      }, AUTO_SAVE_DELAY_MS);
    },
    [save],
  );

  const markDirty = useCallback(() => {
    setDirty(true);
  }, []);

  const markClean = useCallback(() => {
    setDirty(false);
  }, []);

  // Auto-save when dirty and we have a pending spec
  useEffect(() => {
    if (dirty && pendingSpecRef.current) {
      scheduleAutoSave(pendingSpecRef.current);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [dirty, scheduleAutoSave]);

  return {
    save,
    saving,
    error,
    lastSaved,
    dirty,
    markDirty,
    markClean,
  };
}
