import { useMemo } from 'react';
import type { BackendAdapter } from '../lib/backend-adapter';
import { createRestAdapter } from '../lib/rest-adapter';

const PROJECT_KEY = 'spec-intelligence:project';

/**
 * React hook that returns the correct BackendAdapter for the current
 * environment. In the web app, always uses REST. The Tauri adapter
 * is only used in the desktop package directly.
 *
 * Reads the project root from localStorage on every render so newly
 * selected projects are picked up immediately.
 */
export function useBackend(): BackendAdapter {
  const projectRoot =
    typeof window !== 'undefined'
      ? localStorage.getItem(PROJECT_KEY)
      : null;

  const adapter = useMemo<BackendAdapter>(() => {
    return createRestAdapter(undefined, projectRoot);
  }, [projectRoot]);

  return adapter;
}
