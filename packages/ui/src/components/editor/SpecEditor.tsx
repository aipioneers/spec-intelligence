"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { Specification, UserStory, Requirement, SuccessCriterion } from "../../types";
import { UserStoryExtension } from "./nodes/UserStoryNode";
import { RequirementExtension } from "./nodes/RequirementNode";
import { SuccessCriterionExtension } from "./nodes/SuccessCriterionNode";
import { LoadingSpinner } from "../common/LoadingSpinner";

// ── Types ──────────────────────────────────────────────────────────────

type EditorMode = "form" | "markdown" | "raw";

interface SpecEditorProps {
  slug: string;
  spec: Specification;
  onSave: (spec: Specification) => Promise<void>;
}

// ── Helper: Convert spec to TipTap JSON ────────────────────────────────

function specToEditorContent(spec: Specification) {
  const content: Array<Record<string, unknown>> = [];

  // User Stories section
  spec.userStories.forEach((story) => {
    content.push({
      type: "userStory",
      attrs: {
        storyNumber: story.number,
        title: story.title,
        priority: story.priority,
        description: story.description,
        priorityReason: story.priorityReason,
        independentTest: story.independentTest,
        acceptanceScenarios: story.acceptanceScenarios,
      },
    });
  });

  // Requirements section
  spec.requirements.forEach((req) => {
    content.push({
      type: "requirement",
      attrs: {
        requirementId: req.id,
        description: req.description,
      },
    });
  });

  // Success Criteria section
  spec.successCriteria.forEach((sc) => {
    content.push({
      type: "successCriterion",
      attrs: {
        criterionId: sc.id,
        description: sc.description,
      },
    });
  });

  // If empty, add a placeholder paragraph
  if (content.length === 0) {
    content.push({
      type: "paragraph",
      content: [{ type: "text", text: "Start writing your specification..." }],
    });
  }

  return { type: "doc", content };
}

// ── Helper: Convert spec to markdown string ────────────────────────────

function specToMarkdown(spec: Specification): string {
  const lines: string[] = [];

  lines.push(`# ${spec.title}`);
  lines.push("");
  lines.push(spec.description);
  lines.push("");

  // User Stories
  if (spec.userStories.length > 0) {
    lines.push("## User Scenarios");
    lines.push("");
    spec.userStories.forEach((story) => {
      lines.push(
        `### User Story ${story.number} - ${story.title} (Priority: ${story.priority})`,
      );
      lines.push("");
      lines.push(story.description);
      lines.push("");
      if (story.priorityReason) {
        lines.push(`**Why this priority**: ${story.priorityReason}`);
        lines.push("");
      }
      if (story.independentTest) {
        lines.push(`**Independent Test**: ${story.independentTest}`);
        lines.push("");
      }
      if (story.acceptanceScenarios.length > 0) {
        lines.push("**Acceptance Scenarios**:");
        lines.push("");
        story.acceptanceScenarios.forEach((scenario, i) => {
          lines.push(
            `${i + 1}. **Given** ${scenario.given}, **When** ${scenario.when}, **Then** ${scenario.then}.`,
          );
        });
        lines.push("");
      }
      lines.push("---");
      lines.push("");
    });
  }

  // Requirements
  if (spec.requirements.length > 0) {
    lines.push("## Requirements");
    lines.push("");
    spec.requirements.forEach((req) => {
      lines.push(`- **${req.id}**: ${req.description}`);
    });
    lines.push("");
  }

  // Success Criteria
  if (spec.successCriteria.length > 0) {
    lines.push("## Success Criteria");
    lines.push("");
    spec.successCriteria.forEach((sc) => {
      lines.push(`- **${sc.id}**: ${sc.description}`);
    });
    lines.push("");
  }

  // Edge Cases
  if (spec.edgeCases.length > 0) {
    lines.push("## Edge Cases");
    lines.push("");
    spec.edgeCases.forEach((ec) => {
      lines.push(`- ${ec}`);
    });
    lines.push("");
  }

  // Assumptions
  if (spec.assumptions.length > 0) {
    lines.push("## Assumptions");
    lines.push("");
    spec.assumptions.forEach((a) => {
      lines.push(`- ${a}`);
    });
    lines.push("");
  }

  return lines.join("\n");
}

// ── Helper: Extract spec data from TipTap editor JSON ──────────────────

function extractSpecFromEditor(
  json: Record<string, unknown>,
  originalSpec: Specification,
): Specification {
  const userStories: UserStory[] = [];
  const requirements: Requirement[] = [];
  const successCriteria: SuccessCriterion[] = [];

  const content = (json.content as Array<Record<string, unknown>>) || [];

  content.forEach((node) => {
    const attrs = node.attrs as Record<string, unknown>;

    if (node.type === "userStory") {
      userStories.push({
        number: attrs.storyNumber as number,
        title: (attrs.title as string) || "",
        priority: (attrs.priority as UserStory["priority"]) || "P2",
        description: (attrs.description as string) || "",
        priorityReason: (attrs.priorityReason as string) || "",
        independentTest: (attrs.independentTest as string) || "",
        acceptanceScenarios:
          (attrs.acceptanceScenarios as UserStory["acceptanceScenarios"]) || [],
      });
    } else if (node.type === "requirement") {
      const desc = (attrs.description as string) || "";
      const hasClarification = /\[NEEDS CLARIFICATION/.test(desc);
      const clarMatch = desc.match(/\[NEEDS CLARIFICATION:\s*([^\]]+)\]/);
      requirements.push({
        id: (attrs.requirementId as string) || "FR-001",
        description: desc,
        hasClarificationMarker: hasClarification,
        clarificationQuestion: clarMatch ? clarMatch[1] : null,
      });
    } else if (node.type === "successCriterion") {
      successCriteria.push({
        id: (attrs.criterionId as string) || "SC-001",
        description: (attrs.description as string) || "",
      });
    }
  });

  return {
    ...originalSpec,
    userStories:
      userStories.length > 0 ? userStories : originalSpec.userStories,
    requirements:
      requirements.length > 0 ? requirements : originalSpec.requirements,
    successCriteria:
      successCriteria.length > 0
        ? successCriteria
        : originalSpec.successCriteria,
  };
}

// ── Collapsible Section ────────────────────────────────────────────────

interface CollapsibleSectionProps {
  title: string;
  count: number;
  children: React.ReactNode;
  onAdd?: () => void;
  addLabel?: string;
  defaultOpen?: boolean;
}

function CollapsibleSection({
  title,
  count,
  children,
  onAdd,
  addLabel = "Add",
  defaultOpen = true,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-gray-6 bg-gray-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        type="button"
      >
        <div className="flex items-center gap-2">
          <svg
            className={`h-4 w-4 text-gray-9 transition-transform ${open ? "rotate-90" : ""}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m8.25 4.5 7.5 7.5-7.5 7.5"
            />
          </svg>
          <span className="text-sm font-medium text-gray-12">{title}</span>
          <span className="rounded-full bg-gray-4 px-1.5 py-0.5 text-xs text-gray-11">
            {count}
          </span>
        </div>
        {onAdd && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-accent-11 hover:bg-accent-3"
            role="button"
            tabIndex={0}
          >
            <svg
              className="h-3 w-3"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            {addLabel}
          </span>
        )}
      </button>
      {open && <div className="border-t border-gray-6 px-4 py-3">{children}</div>}
    </div>
  );
}

// ── Main SpecEditor Component ──────────────────────────────────────────

export function SpecEditor({ slug, spec, onSave }: SpecEditorProps) {
  const [mode, setMode] = useState<EditorMode>("form");
  const [rawMarkdown, setRawMarkdown] = useState(() => specToMarkdown(spec));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentSpec, setCurrentSpec] = useState(spec);

  // TipTap editor for Form View
  const formEditor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable nodes that conflict with custom ones
        heading: false,
      }),
      UserStoryExtension,
      RequirementExtension,
      SuccessCriterionExtension,
    ],
    content: specToEditorContent(spec),
    onUpdate: () => {
      setDirty(true);
    },
  });

  // TipTap editor for Markdown View
  const markdownEditor = useEditor({
    extensions: [StarterKit],
    content: `<p>${specToMarkdown(spec).replace(/\n/g, "</p><p>")}</p>`,
    onUpdate: () => {
      setDirty(true);
    },
  });

  // Sync content when switching modes
  const handleModeChange = useCallback(
    (newMode: string) => {
      const nextMode = newMode as EditorMode;

      // Extract current data from active mode before switching
      if (mode === "form" && formEditor) {
        const json = formEditor.getJSON();
        const updatedSpec = extractSpecFromEditor(
          json as Record<string, unknown>,
          currentSpec,
        );
        setCurrentSpec(updatedSpec);
        setRawMarkdown(specToMarkdown(updatedSpec));

        if (nextMode === "markdown" && markdownEditor) {
          markdownEditor.commands.setContent(
            specToMarkdown(updatedSpec),
          );
        }
      } else if (mode === "raw") {
        // Raw mode: raw markdown was being edited
        // On switch, we just keep the rawMarkdown state as-is
      }

      setMode(nextMode);
    },
    [mode, formEditor, markdownEditor, currentSpec],
  );

  // Add new items
  const addUserStory = useCallback(() => {
    if (!formEditor) return;
    const nextNumber = currentSpec.userStories.length + 1;
    formEditor
      .chain()
      .focus()
      .insertContent({
        type: "userStory",
        attrs: {
          storyNumber: nextNumber,
          title: "",
          priority: "P2",
          description: "",
          priorityReason: "",
          independentTest: "",
          acceptanceScenarios: [],
        },
      })
      .run();
    setDirty(true);
  }, [formEditor, currentSpec.userStories.length]);

  const addRequirement = useCallback(() => {
    if (!formEditor) return;
    const nextNumber = currentSpec.requirements.length + 1;
    const id = `FR-${String(nextNumber).padStart(3, "0")}`;
    formEditor
      .chain()
      .focus()
      .insertContent({
        type: "requirement",
        attrs: { requirementId: id, description: "" },
      })
      .run();
    setDirty(true);
  }, [formEditor, currentSpec.requirements.length]);

  const addSuccessCriterion = useCallback(() => {
    if (!formEditor) return;
    const nextNumber = currentSpec.successCriteria.length + 1;
    const id = `SC-${String(nextNumber).padStart(3, "0")}`;
    formEditor
      .chain()
      .focus()
      .insertContent({
        type: "successCriterion",
        attrs: { criterionId: id, description: "" },
      })
      .run();
    setDirty(true);
  }, [formEditor, currentSpec.successCriteria.length]);

  // Save handler
  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);

    try {
      let specToSave = currentSpec;

      if (mode === "form" && formEditor) {
        const json = formEditor.getJSON();
        specToSave = extractSpecFromEditor(
          json as Record<string, unknown>,
          currentSpec,
        );
      }

      await onSave(specToSave);
      setCurrentSpec(specToSave);
      setDirty(false);
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  }, [mode, formEditor, currentSpec, onSave, saving]);

  return (
    <div className="flex h-full flex-col">
      {/* Mode Tabs */}
      <Tabs.Root value={mode} onValueChange={handleModeChange}>
        <Tabs.List className="flex border-b border-gray-6 bg-gray-2 px-4">
          <Tabs.Trigger
            value="form"
            className="border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-gray-9 transition-colors hover:text-gray-12 data-[state=active]:border-accent-9 data-[state=active]:text-gray-12"
          >
            Form View
          </Tabs.Trigger>
          <Tabs.Trigger
            value="markdown"
            className="border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-gray-9 transition-colors hover:text-gray-12 data-[state=active]:border-accent-9 data-[state=active]:text-gray-12"
          >
            Markdown
          </Tabs.Trigger>
          <Tabs.Trigger
            value="raw"
            className="border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-gray-9 transition-colors hover:text-gray-12 data-[state=active]:border-accent-9 data-[state=active]:text-gray-12"
          >
            Raw
          </Tabs.Trigger>
        </Tabs.List>

        {/* Form View */}
        <Tabs.Content value="form" className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto max-w-4xl space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-gray-9">
                Title
              </label>
              <input
                type="text"
                value={currentSpec.title}
                onChange={(e) => {
                  setCurrentSpec({ ...currentSpec, title: e.target.value });
                  setDirty(true);
                }}
                className="spec-input mt-1 w-full text-lg font-semibold"
                placeholder="Feature title..."
              />
            </div>

            {/* User Stories */}
            <CollapsibleSection
              title="User Scenarios"
              count={currentSpec.userStories.length}
              onAdd={addUserStory}
              addLabel="Add Story"
            >
              <EditorContent editor={formEditor} className="prose-sm" />
            </CollapsibleSection>

            {/* Requirements */}
            <CollapsibleSection
              title="Requirements"
              count={currentSpec.requirements.length}
              onAdd={addRequirement}
              addLabel="Add Requirement"
            >
              {/* Requirements are rendered inline via TipTap */}
              <div className="space-y-1">
                {currentSpec.requirements.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-start gap-3 rounded-md border border-gray-6 bg-gray-1 px-3 py-2"
                  >
                    <span className="mt-0.5 inline-flex shrink-0 items-center rounded bg-blue-100 px-2 py-0.5 font-mono text-xs font-bold text-blue-800">
                      {req.id}
                    </span>
                    <span className="text-sm text-gray-12">
                      {req.description}
                    </span>
                  </div>
                ))}
              </div>
            </CollapsibleSection>

            {/* Success Criteria */}
            <CollapsibleSection
              title="Success Criteria"
              count={currentSpec.successCriteria.length}
              onAdd={addSuccessCriterion}
              addLabel="Add Criterion"
            >
              <div className="space-y-1">
                {currentSpec.successCriteria.map((sc) => (
                  <div
                    key={sc.id}
                    className="flex items-start gap-3 rounded-md border border-gray-6 bg-gray-1 px-3 py-2"
                  >
                    <span className="mt-0.5 inline-flex shrink-0 items-center rounded bg-green-100 px-2 py-0.5 font-mono text-xs font-bold text-green-800">
                      {sc.id}
                    </span>
                    <span className="text-sm text-gray-12">
                      {sc.description}
                    </span>
                  </div>
                ))}
              </div>
            </CollapsibleSection>

            {/* Edge Cases */}
            <CollapsibleSection
              title="Edge Cases"
              count={currentSpec.edgeCases.length}
              defaultOpen={false}
            >
              <ul className="space-y-1">
                {currentSpec.edgeCases.map((ec, i) => (
                  <li key={i} className="text-sm text-gray-12">
                    {ec}
                  </li>
                ))}
              </ul>
            </CollapsibleSection>

            {/* Assumptions */}
            <CollapsibleSection
              title="Assumptions"
              count={currentSpec.assumptions.length}
              defaultOpen={false}
            >
              <ul className="space-y-1">
                {currentSpec.assumptions.map((a, i) => (
                  <li key={i} className="text-sm text-gray-12">
                    {a}
                  </li>
                ))}
              </ul>
            </CollapsibleSection>
          </div>
        </Tabs.Content>

        {/* Markdown View */}
        <Tabs.Content value="markdown" className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto max-w-4xl">
            <EditorContent
              editor={markdownEditor}
              className="prose prose-sm max-w-none"
            />
          </div>
        </Tabs.Content>

        {/* Raw View */}
        <Tabs.Content value="raw" className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto max-w-4xl">
            <textarea
              value={rawMarkdown}
              onChange={(e) => {
                setRawMarkdown(e.target.value);
                setDirty(true);
              }}
              className="h-[calc(100vh-16rem)] w-full resize-y rounded-md border border-gray-7 bg-gray-1 p-4 font-mono text-sm text-gray-12 outline-none focus:border-accent-8 focus:ring-1 focus:ring-accent-8"
              spellCheck={false}
            />
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
            <span className="text-gray-9">
              All changes saved
            </span>
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
