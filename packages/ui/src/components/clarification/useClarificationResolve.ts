"use client";

import { useCallback, useState } from "react";
import type { BackendAdapter } from "../../lib/backend-adapter";
import type { Specification, Clarification } from "../../types";

// ── Types ───────────────────────────────────────────────────────────────

interface UseClarificationResolveResult {
  /** Whether a resolution is currently in progress. */
  resolving: boolean;
  /** Error message if the last resolution failed. */
  error: string | null;
  /**
   * Resolve a clarification marker in a spec.
   *
   * This function:
   *  1. Replaces the [NEEDS CLARIFICATION: ...] marker text with the answer
   *  2. Appends an entry to the Clarifications section
   *  3. Calls the backend adapter to persist changes
   *
   * @param slug - The feature slug
   * @param markerText - The full marker text, e.g., "[NEEDS CLARIFICATION: What auth method?]"
   * @param answer - The resolution answer
   * @param currentSpec - The current specification object
   * @param adapter - The backend adapter to use for saving
   * @returns The updated specification, or null if the resolution failed.
   */
  resolve: (
    slug: string,
    markerText: string,
    answer: string,
    currentSpec: Specification,
    adapter: BackendAdapter,
  ) => Promise<Specification | null>;
}

// ── Hook ────────────────────────────────────────────────────────────────

export function useClarificationResolve(): UseClarificationResolveResult {
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolve = useCallback(
    async (
      slug: string,
      markerText: string,
      answer: string,
      currentSpec: Specification,
      adapter: BackendAdapter,
    ): Promise<Specification | null> => {
      setResolving(true);
      setError(null);

      try {
        // Extract the question from the marker
        const questionMatch = markerText.match(
          /\[NEEDS CLARIFICATION:\s*([^\]]+)\]/,
        );
        const question = questionMatch
          ? questionMatch[1].trim()
          : markerText;

        // Build the new clarification entry
        const newClarification: Clarification = {
          sessionDate: new Date().toISOString().split("T")[0],
          question,
          answer,
        };

        // Create updated spec: replace marker text in requirements
        const updatedRequirements = currentSpec.requirements.map((req) => {
          if (req.description.includes(markerText)) {
            const newDescription = req.description.replace(markerText, answer);
            return {
              ...req,
              description: newDescription,
              hasClarificationMarker:
                newDescription.includes("[NEEDS CLARIFICATION"),
              clarificationQuestion: null,
            };
          }
          return req;
        });

        // Build updated spec
        const updatedSpec: Specification = {
          ...currentSpec,
          requirements: updatedRequirements,
          clarifications: [
            ...currentSpec.clarifications,
            newClarification,
          ],
        };

        // Persist via adapter
        const result = await adapter.updateSpec(slug, updatedSpec);

        setResolving(false);
        return result.spec;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to resolve clarification";
        setError(message);
        setResolving(false);
        return null;
      }
    },
    [],
  );

  return { resolving, error, resolve };
}
