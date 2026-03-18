// T016: Git operations service — branch management via child_process

import { execSync } from 'node:child_process';

/**
 * Create a new git branch from the current HEAD.
 * Returns true if the branch was created successfully, false otherwise.
 */
export function createBranch(branchName: string): boolean {
  try {
    execSync(`git checkout -b ${sanitizeBranchName(branchName)}`, {
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the current git branch name.
 * Returns the branch name, or 'HEAD' if in detached HEAD state.
 */
export function getCurrentBranch(): string {
  try {
    const result = execSync('git rev-parse --abbrev-ref HEAD', {
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    return result.trim();
  } catch {
    return '';
  }
}

/**
 * Check whether a git branch with the given name exists (locally).
 */
export function branchExists(branchName: string): boolean {
  try {
    const result = execSync(
      `git rev-parse --verify ${sanitizeBranchName(branchName)}`,
      {
        stdio: 'pipe',
        encoding: 'utf-8',
      }
    );
    return result.trim().length > 0;
  } catch {
    return false;
  }
}

// ---------- Internal Helpers ----------

/**
 * Sanitize a branch name to prevent shell injection.
 * Only allows alphanumeric, hyphen, underscore, forward-slash, and dot.
 */
function sanitizeBranchName(name: string): string {
  if (!/^[a-zA-Z0-9._\-/]+$/.test(name)) {
    throw new Error(`Invalid branch name: ${name}`);
  }
  return name;
}
