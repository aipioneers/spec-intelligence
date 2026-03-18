"use client";

import { useState, useCallback } from "react";
import * as Dialog from "@radix-ui/react-dialog";

// ── Types ───────────────────────────────────────────────────────────────

interface ClarificationOption {
  label: string;
  implication: string;
}

interface ClarificationDialogProps {
  /** Whether the dialog is open. */
  open: boolean;
  /** Called when the dialog should close. */
  onOpenChange: (open: boolean) => void;
  /** The original marker text, e.g., "[NEEDS CLARIFICATION: What auth method?]" */
  markerText: string;
  /** The extracted question from the marker. */
  question: string;
  /** Optional predefined answer options with implications. */
  options?: ClarificationOption[];
  /** Called when the user confirms the resolution. */
  onResolve: (answer: string) => void;
}

// ── Component ───────────────────────────────────────────────────────────

export function ClarificationDialog({
  open,
  onOpenChange,
  markerText,
  question,
  options = [],
  onResolve,
}: ClarificationDialogProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [customAnswer, setCustomAnswer] = useState("");

  const currentAnswer = selectedOption ?? customAnswer;

  const handleConfirm = useCallback(() => {
    if (!currentAnswer.trim()) return;
    onResolve(currentAnswer.trim());
    // Reset state
    setSelectedOption(null);
    setCustomAnswer("");
    onOpenChange(false);
  }, [currentAnswer, onResolve, onOpenChange]);

  const handleCancel = useCallback(() => {
    setSelectedOption(null);
    setCustomAnswer("");
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-2xl focus:outline-none">
          {/* Header */}
          <Dialog.Title className="text-lg font-semibold text-gray-12">
            Resolve Clarification
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-gray-9">
            Provide an answer to resolve this clarification marker.
          </Dialog.Description>

          {/* Question context */}
          <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
            <p className="text-xs font-medium text-yellow-800">
              Clarification Needed
            </p>
            <p className="mt-1 text-sm font-medium text-yellow-900">
              {question}
            </p>
            <p className="mt-1 text-xs text-yellow-700">
              Marker: <code className="text-xs">{markerText}</code>
            </p>
          </div>

          {/* Option table (if options are provided) */}
          {options.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-gray-11">
                Suggested Answers
              </p>
              <div className="mt-2 space-y-2">
                {options.map((opt, idx) => (
                  <label
                    key={idx}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                      selectedOption === opt.label
                        ? "border-accent-8 bg-accent-3"
                        : "border-gray-6 hover:bg-gray-2"
                    }`}
                  >
                    <input
                      type="radio"
                      name="clarification-option"
                      checked={selectedOption === opt.label}
                      onChange={() => {
                        setSelectedOption(opt.label);
                        setCustomAnswer("");
                      }}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-accent-9"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-12">
                        {opt.label}
                      </span>
                      <p className="mt-0.5 text-xs text-gray-9">
                        {opt.implication}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Custom answer */}
          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-11">
              {options.length > 0 ? "Or provide a custom answer" : "Your Answer"}
            </label>
            <textarea
              value={customAnswer}
              onChange={(e) => {
                setCustomAnswer(e.target.value);
                setSelectedOption(null);
              }}
              rows={3}
              placeholder="Type your answer here..."
              className="spec-input mt-1 w-full"
            />
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-md px-4 py-2 text-sm font-medium text-gray-11 hover:bg-gray-3"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!currentAnswer.trim()}
              className="spec-button-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              Confirm Resolution
            </button>
          </div>

          {/* Close button */}
          <Dialog.Close asChild>
            <button
              className="absolute right-4 top-4 rounded-sm p-1 text-gray-9 hover:bg-gray-3 hover:text-gray-11"
              aria-label="Close"
            >
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
