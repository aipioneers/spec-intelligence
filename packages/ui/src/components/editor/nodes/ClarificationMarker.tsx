"use client";

import { Mark, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";

// ── Regex for matching clarification markers ────────────────────────────

export const CLARIFICATION_MARKER_REGEX =
  /\[NEEDS CLARIFICATION:\s*([^\]]+)\]/g;

// ── TipTap Mark Extension ───────────────────────────────────────────────

/**
 * ClarificationMarkerExtension
 *
 * A TipTap extension that detects [NEEDS CLARIFICATION: ...] text patterns
 * and renders them with a yellow highlight and a clickable icon.
 *
 * Usage in a TipTap editor:
 *   extensions: [StarterKit, ClarificationMarkerExtension]
 */
export const ClarificationMarkerExtension = Mark.create({
  name: "clarificationMarker",
  priority: 1000,

  addAttributes() {
    return {
      question: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-question"),
        renderHTML: (attributes: Record<string, unknown>) => ({
          "data-question": attributes.question,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="clarification-marker"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-type": "clarification-marker",
        class:
          "inline-flex items-center gap-1 rounded bg-yellow-200 px-1.5 py-0.5 text-sm font-medium text-yellow-900 cursor-pointer hover:bg-yellow-300 transition-colors",
      }),
      0,
    ];
  },
});

// ── Standalone decoration component ─────────────────────────────────────

/**
 * ClarificationMarkerInline
 *
 * A standalone React component for rendering a clarification marker
 * outside of TipTap context (e.g., in a requirements list or form view).
 */
interface ClarificationMarkerInlineProps {
  markerText: string;
  question: string;
  onClick?: (question: string) => void;
}

export function ClarificationMarkerInline({
  markerText,
  question,
  onClick,
}: ClarificationMarkerInlineProps) {
  return (
    <span
      className="inline-flex cursor-pointer items-center gap-1 rounded bg-yellow-200 px-1.5 py-0.5 text-sm font-medium text-yellow-900 transition-colors hover:bg-yellow-300"
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(question)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.(question);
        }
      }}
      title={`Clarification needed: ${question}`}
    >
      {/* Warning icon */}
      <svg
        className="h-3.5 w-3.5 shrink-0"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
        />
      </svg>
      {markerText}
    </span>
  );
}
