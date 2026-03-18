"use client";

import { useEffect, useRef, useCallback, useState } from 'react';
import type { FileChangeEvent } from '../types';
import type { BackendAdapter } from '../lib/backend-adapter';
import { useFileWatcher } from './useFileWatcher';
import { useFeatureStore } from '../stores/feature-store';
import { useEditorStore } from '../stores/editor-store';

// ---------------------------------------------------------------------------
// Toast notification (simple div-based, no external dependency)
// ---------------------------------------------------------------------------

export interface Toast {
  id: string;
  message: string;
  type: 'info' | 'warning';
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Integrates file-watcher events with the feature store and editor store.
 *
 * - On file change: refreshes the feature list.
 * - Shows a toast notification describing the change.
 * - If the current editor document was changed externally, triggers a reload.
 */
export function useFileWatcherIntegration(adapter: BackendAdapter) {
  const { lastEvent } = useFileWatcher(adapter);
  const loadFeatures = useFeatureStore((s) => s.loadFeatures);
  const currentDocument = useEditorStore((s) => s.currentDocument);
  const loadDocument = useEditorStore((s) => s.loadDocument);
  const isDirty = useEditorStore((s) => s.isDirty);

  const [toasts, setToasts] = useState<Toast[]>([]);

  // Track last processed event to avoid duplicates
  const lastProcessedRef = useRef<number>(0);

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const toast: Toast = { id, message, type, timestamp: Date.now() };

    setToasts((prev) => [...prev.slice(-4), toast]); // keep max 5 toasts

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    if (!lastEvent) return;
    if (lastEvent.timestamp <= lastProcessedRef.current) return;
    lastProcessedRef.current = lastEvent.timestamp;

    // 1. Refresh feature list if a known feature artifact changed
    if (lastEvent.featureSlug && lastEvent.artifact !== 'unknown') {
      loadFeatures(adapter);
    }

    // 2. Show toast notification
    const artifactLabel =
      lastEvent.artifact === 'unknown' ? 'file' : lastEvent.artifact;
    const actionLabel =
      lastEvent.type === 'created'
        ? 'created'
        : lastEvent.type === 'deleted'
          ? 'deleted'
          : 'modified';
    const slugLabel = lastEvent.featureSlug
      ? ` in ${lastEvent.featureSlug}`
      : '';

    addToast(
      `${artifactLabel} ${actionLabel}${slugLabel}`,
      lastEvent.type === 'deleted' ? 'warning' : 'info',
    );

    // 3. If the currently open document was changed externally, reload it
    if (
      currentDocument &&
      lastEvent.featureSlug === currentDocument.slug &&
      lastEvent.artifact === currentDocument.artifact &&
      lastEvent.type === 'modified'
    ) {
      if (!isDirty) {
        // Safe to auto-reload — no unsaved changes
        loadDocument(adapter, currentDocument.slug, currentDocument.artifact);
      } else {
        addToast(
          'This file was modified externally. Save or discard your changes to see the update.',
          'warning',
        );
      }
    }
  }, [lastEvent, adapter, loadFeatures, loadDocument, currentDocument, isDirty, addToast]);

  return { toasts, dismissToast };
}
