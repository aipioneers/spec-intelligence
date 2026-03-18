"use client";

import { useState, useCallback } from "react";
import type { Constitution, Principle } from "../../types";

interface ConstitutionEditorProps {
  constitution: Constitution;
  onSave: (constitution: Constitution) => Promise<void>;
}

function PrincipleEditor({
  principle,
  index,
  onChange,
  onRemove,
}: {
  principle: Principle;
  index: number;
  onChange: (index: number, principle: Principle) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="rounded-md border border-gray-6 bg-gray-2 p-3">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-gray-9">
          Principle {index + 1}
        </span>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="text-gray-9 hover:text-red-500"
          aria-label={`Remove principle ${index + 1}`}
        >
          <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="mt-2 space-y-2">
        <div>
          <label className="block text-xs font-medium text-gray-11">Name</label>
          <input
            type="text"
            value={principle.name}
            onChange={(e) =>
              onChange(index, { ...principle, name: e.target.value })
            }
            className="spec-input mt-1 w-full"
            placeholder="Principle name"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-11">
            Description
          </label>
          <textarea
            value={principle.description}
            onChange={(e) =>
              onChange(index, { ...principle, description: e.target.value })
            }
            className="spec-input mt-1 w-full"
            rows={2}
            placeholder="What does this principle mean?"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-11">
            Rationale
          </label>
          <textarea
            value={principle.rationale}
            onChange={(e) =>
              onChange(index, { ...principle, rationale: e.target.value })
            }
            className="spec-input mt-1 w-full"
            rows={2}
            placeholder="Why is this principle important?"
          />
        </div>
      </div>
    </div>
  );
}

export function ConstitutionEditor({
  constitution,
  onSave,
}: ConstitutionEditorProps) {
  const [draft, setDraft] = useState<Constitution>({ ...constitution });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty =
    JSON.stringify(draft) !== JSON.stringify(constitution);

  // --- Principles ---

  const handlePrincipleChange = useCallback(
    (index: number, updated: Principle) => {
      setDraft((prev) => {
        const principles = [...prev.principles];
        principles[index] = updated;
        return { ...prev, principles };
      });
    },
    [],
  );

  const handlePrincipleRemove = useCallback((index: number) => {
    setDraft((prev) => ({
      ...prev,
      principles: prev.principles.filter((_, i) => i !== index),
    }));
  }, []);

  const handleAddPrinciple = useCallback(() => {
    setDraft((prev) => ({
      ...prev,
      principles: [
        ...prev.principles,
        { name: "", description: "", rationale: "" },
      ],
    }));
  }, []);

  // --- Constraints ---

  const handleConstraintChange = useCallback(
    (index: number, value: string) => {
      setDraft((prev) => {
        const constraints = [...prev.constraints];
        constraints[index] = value;
        return { ...prev, constraints };
      });
    },
    [],
  );

  const handleConstraintRemove = useCallback((index: number) => {
    setDraft((prev) => ({
      ...prev,
      constraints: prev.constraints.filter((_, i) => i !== index),
    }));
  }, []);

  const handleAddConstraint = useCallback(() => {
    setDraft((prev) => ({
      ...prev,
      constraints: [...prev.constraints, ""],
    }));
  }, []);

  // --- Development Guidelines ---

  const handleGuidelineChange = useCallback(
    (index: number, value: string) => {
      setDraft((prev) => {
        const developmentGuidelines = [...prev.developmentGuidelines];
        developmentGuidelines[index] = value;
        return { ...prev, developmentGuidelines };
      });
    },
    [],
  );

  const handleGuidelineRemove = useCallback((index: number) => {
    setDraft((prev) => ({
      ...prev,
      developmentGuidelines: prev.developmentGuidelines.filter(
        (_, i) => i !== index,
      ),
    }));
  }, []);

  const handleAddGuideline = useCallback(() => {
    setDraft((prev) => ({
      ...prev,
      developmentGuidelines: [...prev.developmentGuidelines, ""],
    }));
  }, []);

  // --- Save ---

  const handleSave = useCallback(async () => {
    if (!isDirty || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        ...draft,
        lastAmended: new Date().toISOString().split("T")[0],
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save constitution",
      );
    } finally {
      setSaving(false);
    }
  }, [draft, isDirty, saving, onSave]);

  return (
    <div className="space-y-6">
      {/* Version / metadata */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-11">
            Version
          </label>
          <input
            type="text"
            value={draft.version}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, version: e.target.value }))
            }
            className="spec-input mt-1 w-full"
            placeholder="1.0.0"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-11">
            Last Amended
          </label>
          <input
            type="text"
            value={draft.lastAmended}
            readOnly
            className="spec-input mt-1 w-full bg-gray-2"
            placeholder="Auto-set on save"
          />
        </div>
      </div>

      {/* Principles */}
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-12">
            Core Principles
          </h3>
          <button
            type="button"
            onClick={handleAddPrinciple}
            className="text-xs font-medium text-accent-11 hover:text-accent-12"
          >
            + Add Principle
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {draft.principles.map((principle, i) => (
            <PrincipleEditor
              key={i}
              principle={principle}
              index={i}
              onChange={handlePrincipleChange}
              onRemove={handlePrincipleRemove}
            />
          ))}
          {draft.principles.length === 0 && (
            <p className="text-sm text-gray-9">No principles defined yet.</p>
          )}
        </div>
      </div>

      {/* Constraints */}
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-12">Constraints</h3>
          <button
            type="button"
            onClick={handleAddConstraint}
            className="text-xs font-medium text-accent-11 hover:text-accent-12"
          >
            + Add Constraint
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {draft.constraints.map((constraint, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={constraint}
                onChange={(e) => handleConstraintChange(i, e.target.value)}
                className="spec-input flex-1"
                placeholder="Constraint..."
              />
              <button
                type="button"
                onClick={() => handleConstraintRemove(i)}
                className="text-gray-9 hover:text-red-500"
                aria-label={`Remove constraint ${i + 1}`}
              >
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          {draft.constraints.length === 0 && (
            <p className="text-sm text-gray-9">No constraints defined yet.</p>
          )}
        </div>
      </div>

      {/* Development Guidelines */}
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-12">
            Development Guidelines
          </h3>
          <button
            type="button"
            onClick={handleAddGuideline}
            className="text-xs font-medium text-accent-11 hover:text-accent-12"
          >
            + Add Guideline
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {draft.developmentGuidelines.map((guideline, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={guideline}
                onChange={(e) => handleGuidelineChange(i, e.target.value)}
                className="spec-input flex-1"
                placeholder="Guideline..."
              />
              <button
                type="button"
                onClick={() => handleGuidelineRemove(i)}
                className="text-gray-9 hover:text-red-500"
                aria-label={`Remove guideline ${i + 1}`}
              >
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          {draft.developmentGuidelines.length === 0 && (
            <p className="text-sm text-gray-9">
              No development guidelines defined yet.
            </p>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Save */}
      <div className="flex items-center justify-between border-t border-gray-6 pt-4">
        <p className="text-xs text-gray-9">
          {isDirty ? "You have unsaved changes." : "All changes saved."}
        </p>
        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className="spec-button-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Constitution"}
        </button>
      </div>
    </div>
  );
}
