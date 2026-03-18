"use client";

import { useMemo, useState, useCallback } from "react";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ConflictResolverProps {
  localContent: string;
  remoteContent: string;
  onResolve: (result: string) => void;
}

// ---------------------------------------------------------------------------
// Diff helpers
// ---------------------------------------------------------------------------

interface DiffLine {
  type: "same" | "added" | "removed";
  content: string;
  localLineNum: number | null;
  remoteLineNum: number | null;
}

/**
 * Simple line-by-line diff.
 *
 * Walks both arrays in parallel using a basic LCS-like approach:
 * - If lines match -> "same"
 * - If a line only exists in local -> "removed" (shown in red on local side)
 * - If a line only exists in remote -> "added" (shown in green on remote side)
 *
 * This is a straightforward O(n*m) implementation suitable for reasonable
 * document sizes.  No external diff library needed.
 */
function computeDiff(localLines: string[], remoteLines: string[]): DiffLine[] {
  const m = localLines.length;
  const n = remoteLines.length;

  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0),
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (localLines[i - 1] === remoteLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to produce the diff
  const result: DiffLine[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && localLines[i - 1] === remoteLines[j - 1]) {
      result.push({
        type: "same",
        content: localLines[i - 1],
        localLineNum: i,
        remoteLineNum: j,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({
        type: "added",
        content: remoteLines[j - 1],
        localLineNum: null,
        remoteLineNum: j,
      });
      j--;
    } else {
      result.push({
        type: "removed",
        content: localLines[i - 1],
        localLineNum: i,
        remoteLineNum: null,
      });
      i--;
    }
  }

  result.reverse();
  return result;
}

// ---------------------------------------------------------------------------
// Line styling
// ---------------------------------------------------------------------------

function lineClass(type: DiffLine["type"], side: "local" | "remote"): string {
  if (type === "same") return "bg-white text-gray-12";
  if (type === "removed") {
    return side === "local"
      ? "bg-red-50 text-red-900"
      : "bg-gray-1 text-gray-6"; // faded on remote side
  }
  // added
  return side === "remote"
    ? "bg-green-50 text-green-900"
    : "bg-gray-1 text-gray-6"; // faded on local side
}

function lineNumClass(type: DiffLine["type"]): string {
  if (type === "removed") return "text-red-400";
  if (type === "added") return "text-green-400";
  return "text-gray-6";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ConflictResolver({
  localContent,
  remoteContent,
  onResolve,
}: ConflictResolverProps) {
  const [mergeContent, setMergeContent] = useState(localContent);
  const [showMerge, setShowMerge] = useState(false);

  const diff = useMemo(() => {
    const localLines = localContent.split("\n");
    const remoteLines = remoteContent.split("\n");
    return computeDiff(localLines, remoteLines);
  }, [localContent, remoteContent]);

  const hasConflicts = useMemo(
    () => diff.some((line) => line.type !== "same"),
    [diff],
  );

  const handleKeepMine = useCallback(() => {
    onResolve(localContent);
  }, [localContent, onResolve]);

  const handleKeepTheirs = useCallback(() => {
    onResolve(remoteContent);
  }, [remoteContent, onResolve]);

  const handleMerge = useCallback(() => {
    onResolve(mergeContent);
  }, [mergeContent, onResolve]);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-12">
            Conflict Detected
          </h3>
          <p className="mt-0.5 text-sm text-gray-9">
            {hasConflicts
              ? "The file was modified externally. Review the changes below."
              : "No differences found."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleKeepMine}
            className="rounded-md border border-gray-6 bg-white px-3 py-1.5 text-sm font-medium text-gray-11 hover:bg-gray-2"
          >
            Keep Mine
          </button>
          <button
            onClick={handleKeepTheirs}
            className="rounded-md border border-gray-6 bg-white px-3 py-1.5 text-sm font-medium text-gray-11 hover:bg-gray-2"
          >
            Keep Theirs
          </button>
          <button
            onClick={() => setShowMerge((v) => !v)}
            className="rounded-md bg-accent-9 px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-10"
          >
            {showMerge ? "Hide Editor" : "Merge"}
          </button>
        </div>
      </div>

      {/* Split diff view */}
      <div className="grid grid-cols-2 gap-0 overflow-hidden rounded-lg border border-gray-6">
        {/* Local header */}
        <div className="border-b border-r border-gray-6 bg-gray-2 px-3 py-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-9">
            Local (yours)
          </span>
        </div>
        {/* Remote header */}
        <div className="border-b border-gray-6 bg-gray-2 px-3 py-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-9">
            Remote (theirs)
          </span>
        </div>

        {/* Local side */}
        <div className="overflow-auto border-r border-gray-6 font-mono text-xs leading-6">
          {diff.map((line, idx) => (
            <div
              key={idx}
              className={`flex ${lineClass(line.type, "local")}`}
            >
              <span
                className={`w-10 shrink-0 select-none text-right pr-2 ${lineNumClass(line.type)}`}
              >
                {line.localLineNum ?? ""}
              </span>
              <span className="flex-1 whitespace-pre px-2">
                {line.type === "removed" ? (
                  <span className="bg-red-200/50">{line.content}</span>
                ) : line.type === "added" ? (
                  <span className="opacity-30">{line.content}</span>
                ) : (
                  line.content
                )}
              </span>
            </div>
          ))}
        </div>

        {/* Remote side */}
        <div className="overflow-auto font-mono text-xs leading-6">
          {diff.map((line, idx) => (
            <div
              key={idx}
              className={`flex ${lineClass(line.type, "remote")}`}
            >
              <span
                className={`w-10 shrink-0 select-none text-right pr-2 ${lineNumClass(line.type)}`}
              >
                {line.remoteLineNum ?? ""}
              </span>
              <span className="flex-1 whitespace-pre px-2">
                {line.type === "added" ? (
                  <span className="bg-green-200/50">{line.content}</span>
                ) : line.type === "removed" ? (
                  <span className="opacity-30">{line.content}</span>
                ) : (
                  line.content
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Merge editor */}
      {showMerge && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-11">
              Manual merge editor
            </span>
            <button
              onClick={handleMerge}
              className="rounded-md bg-accent-9 px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-10"
            >
              Apply Merge
            </button>
          </div>
          <textarea
            value={mergeContent}
            onChange={(e) => setMergeContent(e.target.value)}
            className="w-full rounded-lg border border-gray-6 bg-white p-3 font-mono text-xs leading-6 text-gray-12 focus:border-accent-8 focus:outline-none focus:ring-1 focus:ring-accent-8"
            rows={Math.max(10, mergeContent.split("\n").length)}
          />
        </div>
      )}
    </div>
  );
}
