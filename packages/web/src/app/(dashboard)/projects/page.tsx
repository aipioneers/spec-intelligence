"use client";

import { useEffect, useState, useCallback } from "react";
import { useBackend, useProjectStore, LoadingSpinner, EmptyState } from "@spec-intelligence/ui";
import type { Project } from "@spec-intelligence/ui";

export default function ProjectsPage() {
  const backend = useBackend();
  const [isTauri, setIsTauri] = useState(false);

  useEffect(() => {
    setIsTauri(!!(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__);
  }, []);
  const { projects, loading, error, loadProjects, openProject, initProject, removeProject, updateProject, setActiveProject } = useProjectStore();
  const [pathInput, setPathInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    loadProjects(backend);
  }, [backend, loadProjects]);

  const handleOpenPath = useCallback(async (path: string) => {
    setActionError(null);
    try {
      const isSpec = await backend.checkIsSpecProject(path);
      if (isSpec) {
        await openProject(backend, path);
      } else {
        if (confirm("This folder is not a Spec Intelligence project. Initialize it?")) {
          await initProject(backend, path);
        } else {
          return;
        }
      }
      setPathInput("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to open project");
    }
  }, [backend, openProject, initProject]);

  const handleOpenFolder = useCallback(async () => {
    if (!pathInput.trim()) return;
    await handleOpenPath(pathInput.trim());
  }, [pathInput, handleOpenPath]);

  const handleBrowseFolder = useCallback(async () => {
    try {
      const { pickFolder } = await import("@spec-intelligence/ui/lib/tauri-adapter");
      const selected = await pickFolder();
      if (selected) {
        await handleOpenPath(selected);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Folder dialog not available");
    }
  }, [handleOpenPath]);

  const handleRemove = useCallback(async (id: string) => {
    if (!confirm("Remove this project from the list? (Files will not be deleted)")) return;
    await removeProject(backend, id);
  }, [backend, removeProject]);

  const handleStartEdit = (project: Project) => {
    setEditingId(project.id);
    setEditName(project.name);
  };

  const handleSaveEdit = useCallback(async () => {
    if (!editingId || !editName.trim()) return;
    await updateProject(backend, editingId, { name: editName.trim() });
    setEditingId(null);
    setEditName("");
  }, [backend, editingId, editName, updateProject]);

  const handleSelect = (project: Project) => {
    setActiveProject(project);
    if (typeof window !== "undefined") {
      localStorage.setItem("spec-intelligence:project", project.path);
    }
    window.location.href = "/features";
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-12">Projects</h1>
        <p className="mt-1 text-sm text-gray-9">Manage your Spec Intelligence projects</p>
      </div>

      {/* Open folder */}
      <div className="mb-8 flex gap-2">
        <input
          type="text"
          value={pathInput}
          onChange={(e) => setPathInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleOpenFolder()}
          placeholder="Enter folder path (e.g. /Users/you/my-project)"
          className="flex-1 rounded-lg border border-gray-6 bg-gray-2 px-4 py-2 text-sm text-gray-12 placeholder:text-gray-8 focus:border-accent-8 focus:outline-none focus:ring-1 focus:ring-accent-8"
        />
        <button
          onClick={handleOpenFolder}
          disabled={!pathInput.trim()}
          className="rounded-lg bg-accent-9 px-4 py-2 text-sm font-medium text-white hover:bg-accent-10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Open
        </button>
        {isTauri && (
          <button
            onClick={handleBrowseFolder}
            className="flex items-center gap-2 rounded-lg border border-gray-6 bg-gray-3 px-4 py-2 text-sm font-medium text-gray-12 hover:bg-gray-4"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
            </svg>
            Browse…
          </button>
        )}
      </div>

      {(error || actionError) && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error || actionError}
        </div>
      )}

      {/* Project list */}
      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description={isTauri
            ? "Click 'Open Folder' to select a project directory."
            : "Enter a folder path above to open or initialize a Spec Intelligence project."
          }
        />
      ) : (
        <div className="space-y-2">
          {projects.map((project) => (
            <div
              key={project.id}
              className="flex items-center justify-between rounded-lg border border-gray-6 bg-gray-2 px-4 py-3 hover:bg-gray-3 transition-colors"
            >
              <div className="flex-1 min-w-0">
                {editingId === project.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveEdit();
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="rounded border border-gray-6 bg-gray-1 px-2 py-1 text-sm text-gray-12 focus:outline-none focus:ring-1 focus:ring-accent-8"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveEdit}
                      className="text-xs text-accent-11 hover:text-accent-12"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-xs text-gray-9 hover:text-gray-11"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => handleSelect(project)}
                      className="font-medium text-gray-12 hover:text-accent-11 text-left"
                    >
                      {project.name}
                    </button>
                    <p className="text-xs text-gray-8 truncate">{project.path}</p>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 ml-4">
                <span className="text-xs text-gray-8">
                  {project.lastOpened ? new Date(project.lastOpened).toLocaleDateString() : "\u2014"}
                </span>
                <button
                  onClick={() => handleStartEdit(project)}
                  className="rounded p-1 text-gray-8 hover:bg-gray-4 hover:text-gray-11"
                  title="Rename"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                  </svg>
                </button>
                <button
                  onClick={() => handleRemove(project.id)}
                  className="rounded p-1 text-gray-8 hover:bg-red-100 hover:text-red-600"
                  title="Remove from list"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
