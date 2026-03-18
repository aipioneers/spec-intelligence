"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import type { FileChangeEvent } from '../types';
import type { BackendAdapter } from '../lib/backend-adapter';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FileWatcherState {
  /** All events received (most recent first, capped at 50). */
  events: FileChangeEvent[];
  /** The most recently received event, or null if none yet. */
  lastEvent: FileChangeEvent | null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Subscribe to file-change events via the BackendAdapter.
 *
 * Events are debounced by 300ms so rapid successive changes (e.g. editors
 * writing temp files then the final file) collapse into fewer updates.
 *
 * Automatically unsubscribes when the component unmounts.
 */
export function useFileWatcher(adapter: BackendAdapter): FileWatcherState {
  const [events, setEvents] = useState<FileChangeEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<FileChangeEvent | null>(null);

  // Debounce timer ref — survives re-renders without causing them.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Buffer for events arriving during the debounce window.
  const bufferRef = useRef<FileChangeEvent[]>([]);

  const flush = useCallback(() => {
    const pending = bufferRef.current;
    if (pending.length === 0) return;

    bufferRef.current = [];

    setEvents((prev) => {
      const next = [...pending, ...prev];
      // Cap at 50 events to avoid unbounded growth
      return next.slice(0, 50);
    });
    setLastEvent(pending[pending.length - 1]);
  }, []);

  useEffect(() => {
    const unsubscribe = adapter.onFileChange((event) => {
      bufferRef.current.push(event);

      // Reset the debounce timer on each incoming event
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(flush, 300);
    });

    return () => {
      unsubscribe();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [adapter, flush]);

  return { events, lastEvent };
}
