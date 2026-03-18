"use client";

import { useCallback } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, NodeViewProps, ReactNodeViewRenderer } from "@tiptap/react";

// ── Node View Component ────────────────────────────────────────────────

interface SuccessCriterionAttrs {
  criterionId: string;
  description: string;
}

function SuccessCriterionNodeView({ node, updateAttributes }: NodeViewProps) {
  const attrs = node.attrs as SuccessCriterionAttrs;

  const handleDescriptionChange = useCallback(
    (value: string) => {
      updateAttributes({ description: value });
    },
    [updateAttributes],
  );

  return (
    <NodeViewWrapper>
      <div className="my-1.5 flex items-start gap-3 rounded-md border border-gray-6 bg-gray-1 px-3 py-2">
        {/* SC-ID badge */}
        <span className="mt-0.5 inline-flex shrink-0 items-center rounded bg-green-100 px-2 py-0.5 font-mono text-xs font-bold text-green-800">
          {attrs.criterionId}
        </span>

        {/* Measurable outcome input */}
        <input
          type="text"
          value={attrs.description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          className="spec-input w-full text-sm"
          placeholder="Measurable outcome..."
        />
      </div>
    </NodeViewWrapper>
  );
}

// ── TipTap Node Extension ──────────────────────────────────────────────

export const SuccessCriterionExtension = Node.create({
  name: "successCriterion",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      criterionId: { default: "SC-001" },
      description: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="success-criterion"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "success-criterion" }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SuccessCriterionNodeView);
  },
});

export { SuccessCriterionNodeView };
