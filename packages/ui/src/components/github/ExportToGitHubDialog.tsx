// T082: Export to GitHub dialog — multi-step wizard with progress
"use client";

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import type { Task } from '../../types/index';
import type { ExportResult, ExportProgress } from '../../lib/github';
import { IssuePreview } from './IssuePreview';

type Step = 'repository' | 'select' | 'confirm';

interface ExportToGitHubDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: Task[];
  featureSlug: string;
  onExport: (
    repository: string,
    taskIds: string[],
  ) => Promise<ExportResult[]>;
  loading: boolean;
  progress: ExportProgress | null;
  results: ExportResult[] | null;
}

export function ExportToGitHubDialog({
  open,
  onOpenChange,
  tasks,
  featureSlug,
  onExport,
  loading,
  progress,
  results,
}: ExportToGitHubDialogProps) {
  const [step, setStep] = useState<Step>('repository');
  const [repository, setRepository] = useState('');
  const [selected, setSelected] = useState<string[]>(() =>
    tasks.map((t) => t.id),
  );

  const handleClose = () => {
    if (!loading) {
      setStep('repository');
      setRepository('');
      setSelected(tasks.map((t) => t.id));
      onOpenChange(false);
    }
  };

  const handleExport = async () => {
    setStep('confirm');
    await onExport(repository, selected);
  };

  const successCount = results?.filter((r) => r.success).length ?? 0;
  const errorCount = results?.filter((r) => !r.success).length ?? 0;

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-2xl">
          <Dialog.Title className="text-lg font-semibold text-gray-12">
            Export to GitHub
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-gray-9">
            Create GitHub issues from your tasks.
          </Dialog.Description>

          {/* Step indicator */}
          <div className="mt-4 flex items-center gap-2 text-xs text-gray-9">
            <span
              className={
                step === 'repository'
                  ? 'font-semibold text-accent-11'
                  : 'text-gray-9'
              }
            >
              1. Repository
            </span>
            <span className="text-gray-6">/</span>
            <span
              className={
                step === 'select'
                  ? 'font-semibold text-accent-11'
                  : 'text-gray-9'
              }
            >
              2. Select Tasks
            </span>
            <span className="text-gray-6">/</span>
            <span
              className={
                step === 'confirm'
                  ? 'font-semibold text-accent-11'
                  : 'text-gray-9'
              }
            >
              3. Export
            </span>
          </div>

          <div className="mt-4">
            {/* Step 1: Repository */}
            {step === 'repository' && (
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="repository"
                    className="block text-sm font-medium text-gray-11"
                  >
                    Repository
                  </label>
                  <input
                    id="repository"
                    type="text"
                    value={repository}
                    onChange={(e) => setRepository(e.target.value)}
                    placeholder="owner/repo"
                    className="spec-input mt-1 w-full"
                    autoFocus
                  />
                  <p className="mt-1 text-xs text-gray-9">
                    Enter the GitHub repository in owner/repo format.
                  </p>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-md px-4 py-2 text-sm font-medium text-gray-11 hover:bg-gray-3"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep('select')}
                    disabled={!repository.includes('/')}
                    className="spec-button-primary"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Task Selection */}
            {step === 'select' && (
              <div className="space-y-4">
                <IssuePreview
                  tasks={tasks}
                  featureSlug={featureSlug}
                  selected={selected}
                  onSelectionChange={setSelected}
                />
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setStep('repository')}
                    className="rounded-md px-4 py-2 text-sm font-medium text-gray-11 hover:bg-gray-3"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleExport}
                    disabled={selected.length === 0}
                    className="spec-button-primary"
                  >
                    Export {selected.length} Issue{selected.length !== 1 ? 's' : ''}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Progress & Results */}
            {step === 'confirm' && (
              <div className="space-y-4">
                {/* Progress bar */}
                {loading && progress && (
                  <div>
                    <div className="flex items-center justify-between text-sm text-gray-11">
                      <span>
                        Exporting {progress.current ?? '...'}
                      </span>
                      <span>
                        {progress.completed}/{progress.total}
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-3">
                      <div
                        className="h-full rounded-full bg-accent-9 transition-all"
                        style={{
                          width: `${
                            progress.total > 0
                              ? (progress.completed / progress.total) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Results */}
                {!loading && results && (
                  <div>
                    <div className="flex items-center gap-4 text-sm">
                      {successCount > 0 && (
                        <span className="text-green-700">
                          {successCount} created successfully
                        </span>
                      )}
                      {errorCount > 0 && (
                        <span className="text-red-700">
                          {errorCount} failed
                        </span>
                      )}
                    </div>

                    <div className="mt-3 max-h-60 overflow-y-auto rounded-lg border border-gray-6">
                      {results.map((result) => (
                        <div
                          key={result.taskId}
                          className="flex items-center justify-between border-b border-gray-4 px-3 py-2 text-sm last:border-b-0"
                        >
                          <span className="font-mono text-xs text-gray-11">
                            {result.taskId}
                          </span>
                          {result.success ? (
                            <a
                              href={result.issueUrl ?? '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-accent-11 hover:underline"
                            >
                              #{result.issueNumber}
                            </a>
                          ) : (
                            <span className="text-xs text-red-700">
                              {result.error}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Close button */}
                {!loading && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="spec-button-primary"
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <Dialog.Close asChild>
            <button
              className="absolute right-4 top-4 rounded-full p-1 text-gray-9 hover:bg-gray-3 hover:text-gray-11"
              aria-label="Close"
              disabled={loading}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 15 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M11.782 4.032a.575.575 0 10-.813-.814L7.5 6.687 4.032 3.218a.575.575 0 00-.814.814L6.687 7.5l-3.469 3.468a.575.575 0 00.814.814L7.5 8.313l3.469 3.469a.575.575 0 00.813-.814L8.313 7.5l3.469-3.468z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
