"use client";

import { useCallback } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, NodeViewProps, ReactNodeViewRenderer } from "@tiptap/react";
import type { Priority, AcceptanceScenario } from "../../../types";

// ── Node View Component ────────────────────────────────────────────────

const priorityColors: Record<Priority, string> = {
  P1: "border-l-red-500",
  P2: "border-l-amber-500",
  P3: "border-l-green-500",
};

const priorityBgColors: Record<Priority, string> = {
  P1: "bg-red-50 text-red-700",
  P2: "bg-amber-50 text-amber-700",
  P3: "bg-green-50 text-green-700",
};

interface UserStoryAttrs {
  storyNumber: number;
  title: string;
  priority: Priority;
  description: string;
  priorityReason: string;
  independentTest: string;
  acceptanceScenarios: AcceptanceScenario[];
}

function UserStoryNodeView({ node, updateAttributes }: NodeViewProps) {
  const attrs = node.attrs as UserStoryAttrs;

  const updateField = useCallback(
    (field: string, value: unknown) => {
      updateAttributes({ [field]: value });
    },
    [updateAttributes],
  );

  const addScenario = useCallback(() => {
    const scenarios = [...(attrs.acceptanceScenarios || [])];
    scenarios.push({ given: "", when: "", then: "" });
    updateAttributes({ acceptanceScenarios: scenarios });
  }, [attrs.acceptanceScenarios, updateAttributes]);

  const removeScenario = useCallback(
    (index: number) => {
      const scenarios = [...(attrs.acceptanceScenarios || [])];
      scenarios.splice(index, 1);
      updateAttributes({ acceptanceScenarios: scenarios });
    },
    [attrs.acceptanceScenarios, updateAttributes],
  );

  const updateScenario = useCallback(
    (index: number, field: keyof AcceptanceScenario, value: string) => {
      const scenarios = [...(attrs.acceptanceScenarios || [])];
      scenarios[index] = { ...scenarios[index], [field]: value };
      updateAttributes({ acceptanceScenarios: scenarios });
    },
    [attrs.acceptanceScenarios, updateAttributes],
  );

  return (
    <NodeViewWrapper>
      <div
        className={`my-3 rounded-lg border border-gray-6 border-l-4 bg-gray-1 p-4 shadow-sm ${priorityColors[attrs.priority]}`}
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent-3 text-xs font-bold text-accent-11">
            {attrs.storyNumber}
          </span>
          <input
            type="text"
            value={attrs.title}
            onChange={(e) => updateField("title", e.target.value)}
            placeholder="User story title"
            className="spec-input flex-1 text-sm font-medium"
          />
          <select
            value={attrs.priority}
            onChange={(e) => updateField("priority", e.target.value)}
            className={`rounded-md border-0 px-2 py-1 text-xs font-semibold ${priorityBgColors[attrs.priority]}`}
          >
            <option value="P1">P1 - Critical</option>
            <option value="P2">P2 - Important</option>
            <option value="P3">P3 - Nice to have</option>
          </select>
        </div>

        {/* Description */}
        <div className="mt-3">
          <label className="block text-xs font-medium text-gray-9">
            Description
          </label>
          <textarea
            value={attrs.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="Describe the user journey in plain language..."
            rows={3}
            className="spec-input mt-1 w-full resize-y text-sm"
          />
        </div>

        {/* Why this priority */}
        <div className="mt-3">
          <label className="block text-xs font-medium text-gray-9">
            Why this priority?
          </label>
          <textarea
            value={attrs.priorityReason}
            onChange={(e) => updateField("priorityReason", e.target.value)}
            placeholder="Explain why this story has this priority level..."
            rows={2}
            className="spec-input mt-1 w-full resize-y text-sm"
          />
        </div>

        {/* Independent Test */}
        <div className="mt-3">
          <label className="block text-xs font-medium text-gray-9">
            Independent Test
          </label>
          <textarea
            value={attrs.independentTest}
            onChange={(e) => updateField("independentTest", e.target.value)}
            placeholder="How to test this story independently..."
            rows={2}
            className="spec-input mt-1 w-full resize-y text-sm"
          />
        </div>

        {/* Acceptance Scenarios */}
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-medium text-gray-9">
              Acceptance Scenarios
            </label>
            <button
              onClick={addScenario}
              type="button"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-accent-11 hover:bg-accent-3"
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
              Add Scenario
            </button>
          </div>

          <div className="mt-2 space-y-3">
            {(attrs.acceptanceScenarios || []).map(
              (scenario: AcceptanceScenario, index: number) => (
                <div
                  key={index}
                  className="relative rounded-md border border-gray-6 bg-gray-2 p-3"
                >
                  <button
                    onClick={() => removeScenario(index)}
                    type="button"
                    className="absolute right-2 top-2 text-gray-9 hover:text-red-500"
                    aria-label="Remove scenario"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18 18 6M6 6l12 12"
                      />
                    </svg>
                  </button>

                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="mt-1.5 w-12 shrink-0 text-xs font-semibold text-green-700">
                        Given
                      </span>
                      <input
                        type="text"
                        value={scenario.given}
                        onChange={(e) =>
                          updateScenario(index, "given", e.target.value)
                        }
                        placeholder="Initial state / precondition..."
                        className="spec-input w-full text-sm"
                      />
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="mt-1.5 w-12 shrink-0 text-xs font-semibold text-blue-700">
                        When
                      </span>
                      <input
                        type="text"
                        value={scenario.when}
                        onChange={(e) =>
                          updateScenario(index, "when", e.target.value)
                        }
                        placeholder="Action performed..."
                        className="spec-input w-full text-sm"
                      />
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="mt-1.5 w-12 shrink-0 text-xs font-semibold text-purple-700">
                        Then
                      </span>
                      <input
                        type="text"
                        value={scenario.then}
                        onChange={(e) =>
                          updateScenario(index, "then", e.target.value)
                        }
                        placeholder="Expected outcome..."
                        className="spec-input w-full text-sm"
                      />
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
}

// ── TipTap Node Extension ──────────────────────────────────────────────

export const UserStoryExtension = Node.create({
  name: "userStory",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      storyNumber: { default: 1 },
      title: { default: "" },
      priority: { default: "P2" },
      description: { default: "" },
      priorityReason: { default: "" },
      independentTest: { default: "" },
      acceptanceScenarios: { default: [] },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="user-story"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "user-story" }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(UserStoryNodeView);
  },
});

export { UserStoryNodeView };
