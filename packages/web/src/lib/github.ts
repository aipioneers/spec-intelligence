// T080: Server-side GitHub client using Octokit
// Uses GH_TOKEN from environment for authentication.

import type { ExportResult } from '@spec-intelligence/ui';

interface IssuePayload {
  title: string;
  body: string;
  labels: string[];
}

interface RepositoryInfo {
  owner: string;
  repo: string;
  defaultBranch: string;
  description: string | null;
}

/**
 * Parse "owner/repo" string into owner and repo parts.
 */
function parseRepository(repository: string): { owner: string; repo: string } {
  const parts = repository.split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(
      `Invalid repository format: "${repository}". Expected "owner/repo".`,
    );
  }
  return { owner: parts[0], repo: parts[1] };
}

/**
 * Get repository information.
 */
export async function getRepository(
  repository: string,
): Promise<RepositoryInfo> {
  const { Octokit } = await import('@octokit/rest');
  const token = process.env.GH_TOKEN;
  if (!token) {
    throw new Error('GH_TOKEN environment variable is not set');
  }

  const octokit = new Octokit({ auth: token });
  const { owner, repo } = parseRepository(repository);

  const { data } = await octokit.repos.get({ owner, repo });

  return {
    owner,
    repo,
    defaultBranch: data.default_branch,
    description: data.description,
  };
}

/**
 * Create GitHub issues from a list of issue payloads.
 * Returns results for each issue creation attempt.
 */
export async function createIssues(
  repository: string,
  issues: { taskId: string; payload: IssuePayload }[],
  onProgress?: (completed: number, total: number, current: string) => void,
): Promise<ExportResult[]> {
  const { Octokit } = await import('@octokit/rest');
  const token = process.env.GH_TOKEN;
  if (!token) {
    throw new Error('GH_TOKEN environment variable is not set');
  }

  const octokit = new Octokit({ auth: token });
  const { owner, repo } = parseRepository(repository);

  const results: ExportResult[] = [];

  for (let i = 0; i < issues.length; i++) {
    const { taskId, payload } = issues[i];

    onProgress?.(i, issues.length, taskId);

    try {
      const { data } = await octokit.issues.create({
        owner,
        repo,
        title: payload.title,
        body: payload.body,
        labels: payload.labels,
      });

      results.push({
        taskId,
        success: true,
        issueNumber: data.number,
        issueUrl: data.html_url,
        error: null,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unknown error creating issue';
      results.push({
        taskId,
        success: false,
        issueNumber: null,
        issueUrl: null,
        error: message,
      });
    }
  }

  onProgress?.(issues.length, issues.length, 'done');

  return results;
}
