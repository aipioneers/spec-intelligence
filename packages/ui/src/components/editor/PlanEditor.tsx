"use client";

import { useState, useCallback } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import type { Plan, TechnicalContext, ConstitutionCheckResult } from "../../types";
import { LoadingSpinner } from "../common/LoadingSpinner";

// ── Types ──────────────────────────────────────────────────────────────

interface PlanEditorProps {
  plan: Plan;
  onSave: (plan: Plan) => Promise<void>;
}

// ── Technical Context Field Config ─────────────────────────────────────

const TECH_CONTEXT_FIELDS: {
  key: keyof TechnicalContext;
  label: string;
  placeholder: string;
  multiline?: boolean;
}[] = [
  { key: "language", label: "Language", placeholder: "e.g. TypeScript 5.4+" },
  {
    key: "dependencies",
    label: "Dependencies",
    placeholder: "Comma-separated, e.g. React 18, Zustand, Tailwind",
    multiline: true,
  },
  { key: "storage", label: "Storage", placeholder: "e.g. PostgreSQL via Supabase" },
  { key: "testing", label: "Testing", placeholder: "e.g. Vitest + Playwright" },
  { key: "targetPlatform", label: "Target Platform", placeholder: "e.g. Web, Desktop (Tauri)" },
  { key: "projectType", label: "Project Type", placeholder: "e.g. Monorepo, SPA, CLI" },
  {
    key: "performanceGoals",
    label: "Performance Goals",
    placeholder: "e.g. <100ms response time",
    multiline: true,
  },
  {
    key: "constraints",
    label: "Constraints",
    placeholder: "e.g. Must work offline",
    multiline: true,
  },
  { key: "scaleScope", label: "Scale / Scope", placeholder: "e.g. Single user, team, enterprise" },
];

// ── Main PlanEditor Component ──────────────────────────────────────────

export function PlanEditor({ plan, onSave }: PlanEditorProps) {
  const [currentPlan, setCurrentPlan] = useState<Plan>(plan);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Summary handlers ─────────────────────────────────────────────────

  const handleSummaryChange = useCallback((value: string) => {
    setCurrentPlan((prev) => ({ ...prev, summary: value }));
    setDirty(true);
  }, []);

  // ── Technical Context handlers ───────────────────────────────────────

  const handleTechContextChange = useCallback(
    (key: keyof TechnicalContext, value: string) => {
      setCurrentPlan((prev) => ({
        ...prev,
        technicalContext: {
          ...prev.technicalContext,
          [key]: key === "dependencies" ? value : value,
        },
      }));
      setDirty(true);
    },
    [],
  );

  // ── Project Structure handler ────────────────────────────────────────

  const handleProjectStructureChange = useCallback((value: string) => {
    setCurrentPlan((prev) => ({ ...prev, projectStructure: value }));
    setDirty(true);
  }, []);

  // ── Save handler ─────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);

    try {
      // Normalize dependencies from comma-separated string to array
      const planToSave: Plan = {
        ...currentPlan,
        technicalContext: {
          ...currentPlan.technicalContext,
          dependencies:
            typeof currentPlan.technicalContext.dependencies === "string"
              ? (currentPlan.technicalContext.dependencies as unknown as string)
                  .split(",")
                  .map((d) => d.trim())
                  .filter(Boolean)
              : currentPlan.technicalContext.dependencies,
        },
      };

      await onSave(planToSave);
      setDirty(false);
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  }, [currentPlan, onSave, saving]);

  // ── Get dependencies display value ───────────────────────────────────

  const depsValue = Array.isArray(currentPlan.technicalContext.dependencies)
    ? currentPlan.technicalContext.dependencies.join(", ")
    : (currentPlan.technicalContext.dependencies as unknown as string) ?? "";

  return (
    <div className="flex h-full flex-col">
      {/* Section Tabs */}
      <Tabs.Root defaultValue="summary">
        <Tabs.List className="flex border-b border-gray-6 bg-gray-2 px-4">
          <Tabs.Trigger
            value="summary"
            className="border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-gray-9 transition-colors hover:text-gray-12 data-[state=active]:border-accent-9 data-[state=active]:text-gray-12"
          >
            Summary
          </Tabs.Trigger>
          <Tabs.Trigger
            value="technical"
            className="border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-gray-9 transition-colors hover:text-gray-12 data-[state=active]:border-accent-9 data-[state=active]:text-gray-12"
          >
            Technical Context
          </Tabs.Trigger>
          <Tabs.Trigger
            value="structure"
            className="border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-gray-9 transition-colors hover:text-gray-12 data-[state=active]:border-accent-9 data-[state=active]:text-gray-12"
          >
            Project Structure
          </Tabs.Trigger>
          <Tabs.Trigger
            value="constitution"
            className="border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-gray-9 transition-colors hover:text-gray-12 data-[state=active]:border-accent-9 data-[state=active]:text-gray-12"
          >
            Constitution Check
          </Tabs.Trigger>
        </Tabs.List>

        {/* Summary Tab */}
        <Tabs.Content value="summary" className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto max-w-4xl">
            <label className="block text-sm font-medium text-gray-11">
              Plan Summary
            </label>
            <textarea
              value={currentPlan.summary}
              onChange={(e) => handleSummaryChange(e.target.value)}
              rows={8}
              className="mt-2 w-full resize-y rounded-md border border-gray-7 bg-gray-1 p-4 text-sm text-gray-12 outline-none focus:border-accent-8 focus:ring-1 focus:ring-accent-8"
              placeholder="Describe the implementation plan..."
            />
          </div>
        </Tabs.Content>

        {/* Technical Context Tab */}
        <Tabs.Content value="technical" className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto max-w-4xl space-y-4">
            {TECH_CONTEXT_FIELDS.map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-11">
                  {field.label}
                </label>
                {field.multiline ? (
                  <textarea
                    value={
                      field.key === "dependencies"
                        ? depsValue
                        : (currentPlan.technicalContext[field.key] as string)
                    }
                    onChange={(e) =>
                      handleTechContextChange(field.key, e.target.value)
                    }
                    rows={3}
                    className="mt-1 w-full resize-y rounded-md border border-gray-7 bg-gray-1 p-3 text-sm text-gray-12 outline-none focus:border-accent-8 focus:ring-1 focus:ring-accent-8"
                    placeholder={field.placeholder}
                  />
                ) : (
                  <input
                    type="text"
                    value={
                      field.key === "dependencies"
                        ? depsValue
                        : (currentPlan.technicalContext[field.key] as string)
                    }
                    onChange={(e) =>
                      handleTechContextChange(field.key, e.target.value)
                    }
                    className="mt-1 w-full rounded-md border border-gray-7 bg-gray-1 px-3 py-2 text-sm text-gray-12 outline-none focus:border-accent-8 focus:ring-1 focus:ring-accent-8"
                    placeholder={field.placeholder}
                  />
                )}
              </div>
            ))}
          </div>
        </Tabs.Content>

        {/* Project Structure Tab */}
        <Tabs.Content value="structure" className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto max-w-4xl">
            <label className="block text-sm font-medium text-gray-11">
              Project Structure
            </label>
            <textarea
              value={currentPlan.projectStructure}
              onChange={(e) => handleProjectStructureChange(e.target.value)}
              rows={16}
              className="mt-2 w-full resize-y rounded-md border border-gray-7 bg-gray-1 p-4 font-mono text-sm text-gray-12 outline-none focus:border-accent-8 focus:ring-1 focus:ring-accent-8"
              placeholder={`src/\n  components/\n  lib/\n  stores/\n  types/`}
              spellCheck={false}
            />
          </div>
        </Tabs.Content>

        {/* Constitution Check Tab */}
        <Tabs.Content value="constitution" className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto max-w-4xl">
            <ConstitutionCheckDisplay check={currentPlan.constitutionCheck} />
          </div>
        </Tabs.Content>
      </Tabs.Root>

      {/* Sticky Save Footer */}
      <div className="sticky bottom-0 flex items-center justify-between border-t border-gray-6 bg-gray-2 px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          {dirty && (
            <span className="flex items-center gap-1.5 text-amber-600">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Unsaved changes
            </span>
          )}
          {!dirty && (
            <span className="text-gray-9">All changes saved</span>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="spec-button-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <LoadingSpinner size="sm" />
              Saving...
            </span>
          ) : (
            "Save"
          )}
        </button>
      </div>
    </div>
  );
}

// ── Constitution Check Display ─────────────────────────────────────────

function ConstitutionCheckDisplay({
  check,
}: {
  check: ConstitutionCheckResult;
}) {
  return (
    <div className="space-y-4">
      {/* Pass / Fail Badge */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-11">Status:</span>
        {check.passed ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
            <svg
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
            Passed
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
            <svg
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
              />
            </svg>
            Failed
          </span>
        )}
      </div>

      {/* Details */}
      {check.details.length > 0 ? (
        <div className="rounded-lg border border-gray-6 bg-gray-2">
          <div className="px-4 py-2.5 text-sm font-medium text-gray-12">
            Details
          </div>
          <ul className="border-t border-gray-6 divide-y divide-gray-6">
            {check.details.map((detail, i) => (
              <li
                key={i}
                className="flex items-start gap-2 px-4 py-2.5 text-sm text-gray-11"
              >
                <span
                  className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                    check.passed ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                {detail}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm italic text-gray-9">
          No constitution check details available.
        </p>
      )}
    </div>
  );
}
