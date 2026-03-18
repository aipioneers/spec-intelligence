"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  useProjectStore,
  useBackend,
  LoadingSpinner,
  EmptyState,
} from "@spec-intelligence/ui";

export default function ProjectSelectorPage() {
  const router = useRouter();
  const [isTauri, setIsTauri] = useState(false);

  useEffect(() => {
    setIsTauri(!!(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__);
  }, []);
  const backend = useBackend();

  const {
    projects,
    loading,
    error: storeError,
    loadProjects,
    openProject,
    initProject,
    setActiveProject,
  } = useProjectStore();

  const [openPath, setOpenPath] = useState("");
  const [createPath, setCreatePath] = useState("");
  const [mode, setMode] = useState<"select" | "create">("select");
  const [creating, setCreating] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showInitPrompt, setShowInitPrompt] = useState(false);
  const [pendingPath, setPendingPath] = useState("");

  const error = localError ?? storeError;

  // Check if a project is already selected; if so, redirect immediately.
  useEffect(() => {
    const saved = localStorage.getItem("spec-intelligence:project");
    if (saved) {
      router.replace("/features");
      return;
    }
    loadProjects(backend);
  }, [router, backend, loadProjects]);

  // -------------------------------------------------------------------
  // Open an existing project by path
  // -------------------------------------------------------------------
  const handleOpen = useCallback(
    async (path: string) => {
      if (!path.trim()) return;
      const trimmed = path.trim();
      setLocalError(null);

      try {
        // Check whether the path is actually a spec project
        const isSpec = await backend.checkIsSpecProject(trimmed);

        if (!isSpec) {
          // Not a spec project — prompt the user to initialize it
          setPendingPath(trimmed);
          setShowInitPrompt(true);
          return;
        }

        const project = await openProject(backend, trimmed);
        setActiveProject(project);
        localStorage.setItem("spec-intelligence:project", project.path);
        router.push("/features");
      } catch (err) {
        setLocalError(
          err instanceof Error ? err.message : "Failed to open project",
        );
      }
    },
    [backend, openProject, setActiveProject, router],
  );

  // -------------------------------------------------------------------
  // Browse for folder (native dialog, Tauri only)
  // -------------------------------------------------------------------
  const handleBrowseOpen = useCallback(async () => {
    try {
      const { pickFolder } = await import("@spec-intelligence/ui/lib/tauri-adapter");
      const selected = await pickFolder();
      if (selected) {
        setOpenPath(selected);
        await handleOpen(selected);
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : String(err));
    }
  }, [handleOpen]);

  const handleBrowseCreate = useCallback(async () => {
    try {
      const { pickFolder } = await import("@spec-intelligence/ui/lib/tauri-adapter");
      const selected = await pickFolder();
      if (selected) {
        setCreatePath(selected);
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  // -------------------------------------------------------------------
  // Initialize & open a path that is not yet a spec project
  // -------------------------------------------------------------------
  const handleInitAndOpen = useCallback(async () => {
    if (!pendingPath) return;
    setLocalError(null);
    setShowInitPrompt(false);
    setCreating(true);

    try {
      const project = await initProject(backend, pendingPath);
      setActiveProject(project);
      localStorage.setItem("spec-intelligence:project", project.path);
      router.push("/features");
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "Failed to initialize project",
      );
    } finally {
      setCreating(false);
      setPendingPath("");
    }
  }, [pendingPath, backend, initProject, setActiveProject, router]);

  // -------------------------------------------------------------------
  // Create a brand-new project
  // -------------------------------------------------------------------
  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!createPath.trim()) return;
      const trimmed = createPath.trim();
      setLocalError(null);
      setCreating(true);

      try {
        const project = await initProject(backend, trimmed);
        setActiveProject(project);
        localStorage.setItem("spec-intelligence:project", project.path);
        router.push("/features");
      } catch (err) {
        setLocalError(
          err instanceof Error ? err.message : "Failed to create project",
        );
      } finally {
        setCreating(false);
      }
    },
    [createPath, backend, initProject, setActiveProject, router],
  );

  // -------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-1">
        <LoadingSpinner size="lg" label="Loading projects..." />
      </div>
    );
  }

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-1 px-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-12">Spec Intelligence</h1>
          <p className="mt-2 text-sm text-gray-9">
            Choose a project to get started
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Init-prompt dialog */}
        {showInitPrompt && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-900">
            <p className="font-medium">
              This directory is not a Spec Intelligence project.
            </p>
            <p className="mt-1">
              Would you like to initialize it? A{" "}
              <code className="rounded bg-amber-100 px-1">specs/</code> folder
              and{" "}
              <code className="rounded bg-amber-100 px-1">constitution.md</code>{" "}
              will be created.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleInitAndOpen}
                className="spec-button-primary"
              >
                Initialize
              </button>
              <button
                onClick={() => {
                  setShowInitPrompt(false);
                  setPendingPath("");
                }}
                className="rounded-md border border-gray-6 bg-gray-1 px-3 py-1.5 text-sm font-medium text-gray-11 transition-colors hover:bg-gray-3"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Mode tabs */}
        <div className="mb-6 flex gap-1 rounded-lg bg-gray-2 p-1">
          <button
            onClick={() => setMode("select")}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              mode === "select"
                ? "bg-gray-1 text-gray-12 shadow-sm"
                : "text-gray-9 hover:text-gray-11"
            }`}
          >
            Open Project
          </button>
          <button
            onClick={() => setMode("create")}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              mode === "create"
                ? "bg-gray-1 text-gray-12 shadow-sm"
                : "text-gray-9 hover:text-gray-11"
            }`}
          >
            New Project
          </button>
        </div>

        {mode === "select" && (
          <div className="space-y-3">
            {/* Recent projects */}
            {projects.length > 0 && (
              <div>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-9">
                  Recent Projects
                </h2>
                <div className="space-y-2">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleOpen(project.path)}
                      className="flex w-full items-center gap-3 rounded-lg border border-gray-6 bg-gray-2 p-4 text-left transition-colors hover:border-accent-8 hover:bg-gray-3"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-3 text-accent-11">
                        <svg
                          className="h-5 w-5"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
                          />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-12">
                          {project.name}
                        </div>
                        <div className="truncate text-xs text-gray-9">
                          {project.path}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Open by path */}
            <div className="pt-2">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-9">
                Open by Path
              </h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleOpen(openPath);
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={openPath}
                  onChange={(e) => setOpenPath(e.target.value)}
                  placeholder="/path/to/project"
                  className="spec-input flex-1"
                />
                <button
                  type="submit"
                  disabled={!openPath.trim()}
                  className="spec-button-primary"
                >
                  Open
                </button>
                {isTauri && (
                  <button
                    type="button"
                    onClick={handleBrowseOpen}
                    className="flex items-center gap-1.5 rounded-md border border-gray-6 bg-gray-2 px-3 py-1.5 text-sm font-medium text-gray-11 transition-colors hover:bg-gray-3"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                    </svg>
                    Browse…
                  </button>
                )}
              </form>
            </div>

            {projects.length === 0 && (
              <EmptyState
                title="No recent projects"
                description="Enter a path above or create a new project."
                action={{
                  label: "Create New Project",
                  onClick: () => setMode("create"),
                }}
              />
            )}
          </div>
        )}

        {mode === "create" && (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label
                htmlFor="createPath"
                className="block text-sm font-medium text-gray-11"
              >
                Project Path
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  id="createPath"
                  type="text"
                  value={createPath}
                  onChange={(e) => setCreatePath(e.target.value)}
                  placeholder="/path/to/new-project"
                  className="spec-input flex-1"
                  required
                  autoFocus
                />
                {isTauri && (
                  <button
                    type="button"
                    onClick={handleBrowseCreate}
                    className="flex items-center gap-1.5 rounded-md border border-gray-6 bg-gray-2 px-3 py-1.5 text-sm font-medium text-gray-11 transition-colors hover:bg-gray-3"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                    </svg>
                    Browse…
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-9">
                A <code className="rounded bg-gray-3 px-1">specs/</code> folder
                and a{" "}
                <code className="rounded bg-gray-3 px-1">constitution.md</code>{" "}
                will be created automatically.
              </p>
            </div>
            <button
              type="submit"
              disabled={creating || !createPath.trim()}
              className="spec-button-primary w-full"
            >
              {creating ? "Creating..." : "Create Project"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
