"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  useEditorStore,
  useBackend,
  LoadingSpinner,
  ErrorBoundary,
  StatusBadge,
} from "@spec-intelligence/ui";
import type { EditorMode, Specification } from "@spec-intelligence/ui";

// ---------------------------------------------------------------------------
// Mode selector tabs
// ---------------------------------------------------------------------------

const MODE_OPTIONS: { label: string; value: EditorMode }[] = [
  { label: "Form", value: "form" },
  { label: "Markdown", value: "markdown" },
  { label: "Raw", value: "raw" },
];

// ---------------------------------------------------------------------------
// Form editor — renders parsed spec fields
// ---------------------------------------------------------------------------

function SpecFormEditor({
  spec,
  onUpdate,
}: {
  spec: Specification;
  onUpdate: (spec: Specification) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-11">Title</label>
        <input
          type="text"
          value={spec.title}
          onChange={(e) => onUpdate({ ...spec, title: e.target.value })}
          className="spec-input mt-1 w-full text-lg font-semibold"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-11">
          Description
        </label>
        <textarea
          value={spec.description}
          onChange={(e) => onUpdate({ ...spec, description: e.target.value })}
          rows={3}
          className="spec-input mt-1 w-full"
        />
      </div>

      {/* User Stories */}
      <div>
        <h3 className="text-sm font-semibold text-gray-12">
          User Stories ({spec.userStories.length})
        </h3>
        {spec.userStories.length === 0 ? (
          <p className="mt-2 text-sm text-gray-9 italic">
            No user stories defined yet.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {spec.userStories.map((story, i) => (
              <li
                key={story.number}
                className="rounded-md border border-gray-6 bg-gray-2 p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded bg-accent-3 px-1.5 py-0.5 text-xs font-medium text-accent-11">
                    US{story.number}
                  </span>
                  <span className="text-xs font-medium text-gray-9">
                    {story.priority}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium text-gray-12">
                  {story.title}
                </p>
                <p className="mt-0.5 text-sm text-gray-9">
                  {story.description}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Requirements */}
      <div>
        <h3 className="text-sm font-semibold text-gray-12">
          Requirements ({spec.requirements.length})
        </h3>
        {spec.requirements.length === 0 ? (
          <p className="mt-2 text-sm text-gray-9 italic">
            No requirements defined yet.
          </p>
        ) : (
          <ul className="mt-2 space-y-1">
            {spec.requirements.map((req) => (
              <li
                key={req.id}
                className="flex items-start gap-2 text-sm text-gray-11"
              >
                <span className="font-mono text-xs text-gray-9">{req.id}</span>
                <span>{req.description}</span>
                {req.hasClarificationMarker && (
                  <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
                    Needs Clarification
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Success Criteria */}
      <div>
        <h3 className="text-sm font-semibold text-gray-12">
          Success Criteria ({spec.successCriteria.length})
        </h3>
        {spec.successCriteria.length === 0 ? (
          <p className="mt-2 text-sm text-gray-9 italic">
            No success criteria defined yet.
          </p>
        ) : (
          <ul className="mt-2 space-y-1">
            {spec.successCriteria.map((sc) => (
              <li
                key={sc.id}
                className="flex items-start gap-2 text-sm text-gray-11"
              >
                <span className="font-mono text-xs text-gray-9">{sc.id}</span>
                <span>{sc.description}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Edge Cases */}
      {spec.edgeCases.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-12">
            Edge Cases ({spec.edgeCases.length})
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {spec.edgeCases.map((ec, i) => (
              <li key={i} className="text-sm text-gray-11">
                {ec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Assumptions */}
      {spec.assumptions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-12">
            Assumptions ({spec.assumptions.length})
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {spec.assumptions.map((a, i) => (
              <li key={i} className="text-sm text-gray-11">
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Markdown / Raw editor — textarea
// ---------------------------------------------------------------------------

function TextEditor({
  content,
  onChange,
  mode,
}: {
  content: string;
  onChange: (value: string) => void;
  mode: "markdown" | "raw";
}) {
  return (
    <textarea
      value={content}
      onChange={(e) => onChange(e.target.value)}
      className={`spec-input h-[calc(100vh-280px)] w-full resize-none font-mono text-sm ${
        mode === "raw" ? "whitespace-pre" : ""
      }`}
      spellCheck={mode === "markdown"}
    />
  );
}

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------

function SpecEditorInner({ slug }: { slug: string }) {
  const router = useRouter();
  const backend = useBackend();
  const {
    currentDocument,
    mode,
    isDirty,
    loading,
    saving,
    error,
    lastSavedAt,
    loadDocument,
    saveDocument,
    switchMode,
    updateContent,
    updateParsed,
  } = useEditorStore();

  // Load document on mount
  useEffect(() => {
    loadDocument(backend, slug, "spec");
  }, [backend, slug, loadDocument]);

  // Keyboard shortcut: Cmd/Ctrl+S to save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (isDirty) {
          saveDocument(backend);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [backend, isDirty, saveDocument]);

  const handleSave = useCallback(() => {
    saveDocument(backend);
  }, [backend, saveDocument]);

  // Feature name from slug
  const featureName = slug
    .replace(/^\d+-/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" label="Loading specification..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-lg border border-red-300 bg-red-50 px-6 py-8 text-center">
          <h2 className="text-lg font-semibold text-red-900">
            Failed to load specification
          </h2>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <div className="mt-4 flex justify-center gap-3">
            <button
              onClick={() => loadDocument(backend, slug, "spec")}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Retry
            </button>
            <button
              onClick={() => router.push("/features")}
              className="rounded-md px-4 py-2 text-sm font-medium text-gray-11 hover:bg-gray-3"
            >
              Back to Features
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/features")}
            className="rounded-md p-1.5 text-gray-9 hover:bg-gray-3 hover:text-gray-11"
            aria-label="Back to features"
          >
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
                d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
              />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-12">{featureName}</h1>
            <p className="text-xs text-gray-9">
              {slug} &middot; Specification Editor
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Save status */}
          <span className="text-xs text-gray-9">
            {saving
              ? "Saving..."
              : isDirty
                ? "Unsaved changes"
                : lastSavedAt
                  ? `Saved ${lastSavedAt.toLocaleTimeString()}`
                  : ""}
          </span>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            className="spec-button-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>

          {/* Next Step button — visible after saving with content */}
          {!isDirty && lastSavedAt && (
            <button
              onClick={() => {
                const parsed = currentDocument?.parsed as Specification | undefined;
                const hasClarifications = parsed?.requirements.some((r) => r.hasClarificationMarker);
                if (hasClarifications) {
                  // Stay on spec page for clarification
                  router.push(`/features/${slug}/clarify`);
                } else {
                  router.push(`/features/${slug}/plan`);
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
            >
              Next Step
              <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Mode tabs */}
      <div className="mt-6 flex gap-1 rounded-lg bg-gray-2 p-1">
        {MODE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => switchMode(opt.value)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              mode === opt.value
                ? "bg-white text-gray-12 shadow-sm"
                : "text-gray-9 hover:text-gray-11"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Editor area */}
      <div className="mt-4">
        {mode === "form" && currentDocument?.parsed && (
          <SpecFormEditor
            spec={currentDocument.parsed as Specification}
            onUpdate={(spec) => updateParsed(spec)}
          />
        )}
        {(mode === "markdown" || mode === "raw") && (
          <TextEditor
            content={currentDocument?.content ?? ""}
            onChange={updateContent}
            mode={mode}
          />
        )}
      </div>
    </div>
  );
}

export function SpecEditorClient({ slug }: { slug: string }) {
  return (
    <ErrorBoundary>
      <SpecEditorInner slug={slug} />
    </ErrorBoundary>
  );
}
