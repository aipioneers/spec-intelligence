// T015: Feature discovery service — scan specs/ directory for feature directories
// Derives feature status from artifact presence and content

import { readdir, stat, readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import type { Feature, FeatureStatus } from '../types/index';

/**
 * Feature directory name pattern: NNN-short-name (e.g., 001-spec-kit-ui)
 */
const FEATURE_DIR_PATTERN = /^(\d{3,})-(.+)$/;

/**
 * Scan a specs/ directory path for feature directories and return Feature metadata.
 *
 * Status derivation rules:
 * - Draft: spec.md exists, no plan.md
 * - Clarifying: spec.md contains [NEEDS CLARIFICATION] markers
 * - Planned: plan.md exists, no tasks.md
 * - InProgress: tasks.md exists with at least one task not complete
 * - Complete: tasks.md exists with all tasks marked complete
 */
export async function discoverFeatures(specsDir: string): Promise<Feature[]> {
  const features: Feature[] = [];

  let entries: string[];
  try {
    entries = await readdir(specsDir);
  } catch {
    // Directory doesn't exist or is unreadable
    return features;
  }

  for (const entry of entries) {
    const match = entry.match(FEATURE_DIR_PATTERN);
    if (!match) continue;

    const featureDir = join(specsDir, entry);

    // Verify it's a directory
    try {
      const stats = await stat(featureDir);
      if (!stats.isDirectory()) continue;
    } catch {
      continue;
    }

    const number = match[1];
    const shortName = match[2];
    const slug = entry;

    // Check which artifacts exist
    const specPath = join(featureDir, 'spec.md');
    const planPath = join(featureDir, 'plan.md');
    const tasksPath = join(featureDir, 'tasks.md');

    const specExists = await fileExists(specPath);
    if (!specExists) continue; // A feature must have at least a spec.md

    const planExists = await fileExists(planPath);
    const tasksExists = await fileExists(tasksPath);

    // Discover checklist files
    const checklistPaths = await discoverChecklists(featureDir);

    // Parse spec header for creation date
    const createdAt = await extractCreatedDate(specPath);

    // Derive status
    const status = await deriveStatus(specPath, planExists, tasksExists, tasksPath);

    const feature: Feature = {
      number,
      shortName,
      slug,
      branchName: slug,
      status,
      createdAt,
      specPath,
      planPath: planExists ? planPath : null,
      tasksPath: tasksExists ? tasksPath : null,
      checklistPaths,
    };

    features.push(feature);
  }

  // Sort by feature number
  features.sort((a, b) => a.number.localeCompare(b.number));

  return features;
}

// ---------- Internal Helpers ----------

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function discoverChecklists(featureDir: string): Promise<string[]> {
  const checklistsDir = join(featureDir, 'checklists');
  try {
    const entries = await readdir(checklistsDir);
    return entries
      .filter((e) => e.endsWith('.md'))
      .map((e) => join(checklistsDir, e));
  } catch {
    return [];
  }
}

async function extractCreatedDate(specPath: string): Promise<string> {
  try {
    const content = await readFile(specPath, 'utf-8');
    // Match **Created**: YYYY-MM-DD
    const match = content.match(/\*?\*?Created\*?\*?:\s*(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  } catch {
    // Ignore read errors
  }
  return '';
}

async function deriveStatus(
  specPath: string,
  planExists: boolean,
  tasksExists: boolean,
  tasksPath: string
): Promise<FeatureStatus> {
  // Check for clarification markers in spec
  try {
    const specContent = await readFile(specPath, 'utf-8');
    if (specContent.includes('[NEEDS CLARIFICATION')) {
      return 'Clarifying';
    }
  } catch {
    // Fall through
  }

  if (tasksExists) {
    // Check if all tasks are complete
    try {
      const tasksContent = await readFile(tasksPath, 'utf-8');
      const allComplete = areAllTasksComplete(tasksContent);
      return allComplete ? 'Complete' : 'InProgress';
    } catch {
      return 'InProgress';
    }
  }

  if (planExists) {
    return 'Planned';
  }

  return 'Draft';
}

function areAllTasksComplete(tasksMarkdown: string): boolean {
  // Find all task checkbox lines
  const taskLines = tasksMarkdown.match(/^\s*-\s*\[[ xX]\]\s+T\d{3,4}/gm);
  if (!taskLines || taskLines.length === 0) return false;

  // Check if all are checked
  return taskLines.every((line) => /\[[xX]\]/.test(line));
}
