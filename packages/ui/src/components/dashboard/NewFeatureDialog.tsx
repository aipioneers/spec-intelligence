"use client";

import { useState, useMemo, useCallback } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { LoadingSpinner } from "../common/LoadingSpinner";

interface NewFeatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (description: string, shortName?: string) => Promise<void>;
}

/**
 * Generate a kebab-case short name from a description.
 * Extracts keywords, removes stop words, limits to 3-4 words.
 */
function generateShortName(description: string): string {
  const stopWords = new Set([
    "a",
    "an",
    "the",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "shall",
    "can",
    "need",
    "must",
    "and",
    "or",
    "but",
    "if",
    "then",
    "else",
    "when",
    "up",
    "out",
    "on",
    "off",
    "in",
    "to",
    "for",
    "of",
    "with",
    "by",
    "at",
    "from",
    "as",
    "into",
    "through",
    "during",
    "before",
    "after",
    "above",
    "below",
    "between",
    "same",
    "each",
    "every",
    "this",
    "that",
    "these",
    "those",
    "it",
    "its",
    "i",
    "we",
    "you",
    "they",
    "me",
    "us",
    "him",
    "her",
    "them",
    "my",
    "our",
    "your",
    "his",
    "their",
    "what",
    "which",
    "who",
    "whom",
    "where",
    "how",
    "not",
    "no",
    "nor",
    "so",
    "too",
    "very",
    "just",
    "about",
    "also",
    "both",
    "than",
  ]);

  const words = description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !stopWords.has(w));

  return words.slice(0, 4).join("-") || "new-feature";
}

export function NewFeatureDialog({
  open,
  onOpenChange,
  onSubmit,
}: NewFeatureDialogProps) {
  const [description, setDescription] = useState("");
  const [shortNameOverride, setShortNameOverride] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const autoShortName = useMemo(
    () => generateShortName(description),
    [description],
  );

  const effectiveShortName = shortNameOverride.trim() || autoShortName;
  const branchPreview = `XXX-${effectiveShortName}`;
  const isValid = description.trim().length >= 10;

  const handleSubmit = useCallback(async () => {
    if (!isValid || loading) return;

    setLoading(true);
    setError(null);

    try {
      await onSubmit(
        description.trim(),
        shortNameOverride.trim() || undefined,
      );
      // Reset form on success
      setDescription("");
      setShortNameOverride("");
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create feature",
      );
    } finally {
      setLoading(false);
    }
  }, [description, shortNameOverride, isValid, loading, onSubmit, onOpenChange]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!loading) {
        if (!nextOpen) {
          // Reset on close
          setDescription("");
          setShortNameOverride("");
          setError(null);
        }
        onOpenChange(nextOpen);
      }
    },
    [loading, onOpenChange],
  );

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-gray-6 bg-gray-1 p-6 shadow-xl focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <Dialog.Title className="text-lg font-semibold text-gray-12">
            Create New Feature
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-gray-9">
            Describe the feature you want to build. A structured specification
            will be generated from your description.
          </Dialog.Description>

          <div className="mt-5 space-y-4">
            {/* Description textarea */}
            <div>
              <label
                htmlFor="feature-description"
                className="block text-sm font-medium text-gray-11"
              >
                Feature Description{" "}
                <span className="text-red-500">*</span>
              </label>
              <textarea
                id="feature-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the feature you want to build in natural language (min 10 characters)..."
                rows={4}
                className="spec-input mt-1.5 w-full resize-y"
                disabled={loading}
              />
              {description.length > 0 && description.trim().length < 10 && (
                <p className="mt-1 text-xs text-red-500">
                  Description must be at least 10 characters
                </p>
              )}
            </div>

            {/* Short name override */}
            <div>
              <label
                htmlFor="feature-short-name"
                className="block text-sm font-medium text-gray-11"
              >
                Short Name{" "}
                <span className="text-xs font-normal text-gray-9">
                  (optional)
                </span>
              </label>
              <input
                id="feature-short-name"
                type="text"
                value={shortNameOverride}
                onChange={(e) =>
                  setShortNameOverride(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, "-")
                      .replace(/-+/g, "-"),
                  )
                }
                placeholder={autoShortName}
                className="spec-input mt-1.5 w-full"
                disabled={loading}
              />
              <p className="mt-1 text-xs text-gray-9">
                Auto-generated from description. Override if needed.
              </p>
            </div>

            {/* Branch name preview */}
            {description.trim().length > 0 && (
              <div className="rounded-md bg-gray-3 px-3 py-2">
                <p className="text-xs text-gray-9">Branch name preview:</p>
                <p className="mt-0.5 font-mono text-sm text-gray-12">
                  {branchPreview}
                </p>
              </div>
            )}

            {/* Error display */}
            {error && (
              <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-3">
            <Dialog.Close asChild>
              <button
                className="spec-button-secondary"
                disabled={loading}
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              onClick={handleSubmit}
              disabled={!isValid || loading}
              className="spec-button-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  Creating...
                </span>
              ) : (
                "Create"
              )}
            </button>
          </div>

          {/* Close button */}
          <Dialog.Close asChild>
            <button
              className="absolute right-4 top-4 rounded-sm text-gray-9 hover:text-gray-11 focus:outline-none focus:ring-2 focus:ring-accent-8"
              disabled={loading}
              aria-label="Close"
            >
              <svg
                className="h-4 w-4"
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
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
