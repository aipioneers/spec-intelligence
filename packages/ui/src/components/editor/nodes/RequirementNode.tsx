"use client";

import { useCallback, useMemo } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, NodeViewProps, ReactNodeViewRenderer } from "@tiptap/react";

// ── Node View Component ────────────────────────────────────────────────

interface RequirementAttrs {
  requirementId: string;
  description: string;
}

const CLARIFICATION_REGEX = /\[NEEDS CLARIFICATION:\s*([^\]]+)\]/;

function RequirementNodeView({ node, updateAttributes }: NodeViewProps) {
  const attrs = node.attrs as RequirementAttrs;

  const clarification = useMemo(() => {
    const match = attrs.description.match(CLARIFICATION_REGEX);
    if (match) {
      return {
        found: true,
        question: match[1],
        fullMatch: match[0],
        index: match.index!,
      };
    }
    return { found: false, question: null, fullMatch: null, index: -1 };
  }, [attrs.description]);

  const handleDescriptionChange = useCallback(
    (value: string) => {
      updateAttributes({ description: value });
    },
    [updateAttributes],
  );

  return (
    <NodeViewWrapper>
      <div className="my-1.5 flex items-start gap-3 rounded-md border border-gray-6 bg-gray-1 px-3 py-2">
        {/* FR-ID badge */}
        <span className="mt-0.5 inline-flex shrink-0 items-center rounded bg-blue-100 px-2 py-0.5 font-mono text-xs font-bold text-blue-800">
          {attrs.requirementId}
        </span>

        {/* Description input */}
        <div className="flex-1">
          {clarification.found ? (
            <div className="space-y-1">
              {/* Render text before the clarification marker */}
              {clarification.index > 0 && (
                <span className="text-sm text-gray-12">
                  {attrs.description.substring(0, clarification.index)}
                </span>
              )}

              {/* Clarification marker highlighted */}
              <span
                className="inline-block cursor-pointer rounded bg-yellow-200 px-1.5 py-0.5 text-sm font-medium text-yellow-900 hover:bg-yellow-300"
                title={`Clarification needed: ${clarification.question}`}
              >
                {clarification.fullMatch}
              </span>

              {/* Text after the marker */}
              {clarification.index! + clarification.fullMatch!.length <
                attrs.description.length && (
                <span className="text-sm text-gray-12">
                  {attrs.description.substring(
                    clarification.index! + clarification.fullMatch!.length,
                  )}
                </span>
              )}

              {/* Editable full text below */}
              <input
                type="text"
                value={attrs.description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                className="spec-input mt-1 w-full text-sm"
                placeholder="System MUST..."
              />
            </div>
          ) : (
            <input
              type="text"
              value={attrs.description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              className="spec-input w-full text-sm"
              placeholder="System MUST..."
            />
          )}
        </div>
      </div>
    </NodeViewWrapper>
  );
}

// ── TipTap Node Extension ──────────────────────────────────────────────

export const RequirementExtension = Node.create({
  name: "requirement",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      requirementId: { default: "FR-001" },
      description: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="requirement"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "requirement" }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(RequirementNodeView);
  },
});

export { RequirementNodeView };
