"use client";

import { useCallback, useRef } from "react";
import type { TaskStatus } from "../../types";
import type { BackendAdapter } from "../../lib/backend-adapter";
import { useKanbanStore } from "../../stores/kanban-store";

// ── Types ──────────────────────────────────────────────────────────────

interface UseKanbanSyncOptions {
  adapter: BackendAdapter;
  slug: string;
  /** Debounce delay in milliseconds for rapid changes. Default: 300ms. */
  debounceMs?: number;
}

interface UseKanbanSyncReturn {
  /** Handle drag-end by updating task status with optimistic update. */
  handleStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  /** Whether a sync operation is in progress. */
  syncing: boolean;
  /** Last sync error, if any. */
  syncError: string | null;
}

// ── Hook ───────────────────────────────────────────────────────────────

export function useKanbanSync({
  adapter,
  slug,
  debounceMs = 300,
}: UseKanbanSyncOptions): UseKanbanSyncReturn {
  const { updateTaskStatus, error } = useKanbanStore();
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const syncingRef = useRef(false);

  const handleStatusChange = useCallback(
    (taskId: string, newStatus: TaskStatus) => {
      // Clear any pending debounce for this task
      if (debounceTimers.current[taskId]) {
        clearTimeout(debounceTimers.current[taskId]);
      }

      // Debounce rapid changes for the same task
      debounceTimers.current[taskId] = setTimeout(async () => {
        syncingRef.current = true;
        try {
          await updateTaskStatus(adapter, slug, taskId, newStatus);
        } finally {
          syncingRef.current = false;
          delete debounceTimers.current[taskId];
        }
      }, debounceMs);
    },
    [adapter, slug, debounceMs, updateTaskStatus],
  );

  return {
    handleStatusChange,
    syncing: syncingRef.current,
    syncError: error,
  };
}
