import { NextRequest, NextResponse } from "next/server";
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { homedir } from "node:os";
import type { Feature, FeatureStatus, Specification } from "@spec-intelligence/ui";
import { getProjectRoot } from "../../../lib/project-root";

// ---------------------------------------------------------------------------
// Multi-project support
// ---------------------------------------------------------------------------

interface RegisteredProject {
  id: string;
  name: string;
  path: string;
}

/** Load all registered projects from ~/.spec-intelligence/projects.json,
 *  filtering to only those whose `specs/` directory exists on disk. */
function loadAllProjects(): RegisteredProject[] {
  const projectsPath = join(homedir(), ".spec-intelligence", "projects.json");
  if (!existsSync(projectsPath)) return [];
  try {
    const raw = readFileSync(projectsPath, "utf-8");
    const parsed = JSON.parse(raw) as RegisteredProject[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p) =>
        p &&
        typeof p.id === "string" &&
        typeof p.name === "string" &&
        typeof p.path === "string" &&
        existsSync(join(p.path, "specs")),
    );
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse a feature directory name like "001-spec-kit-ui" into its parts. */
function parseFeatureDir(dirName: string): {
  number: string;
  shortName: string;
  slug: string;
} | null {
  const match = dirName.match(/^(\d{3})-(.+)$/);
  if (!match) return null;
  return {
    number: match[1],
    shortName: match[2],
    slug: dirName,
  };
}

/**
 * Derive feature status from which artifacts exist and their content.
 *
 * Rules from data-model.md:
 *  - Draft: spec.md exists, no plan.md
 *  - Clarifying: spec.md contains [NEEDS CLARIFICATION] markers
 *  - Planned: plan.md exists, no tasks.md
 *  - InProgress: tasks.md exists with at least one task not complete
 *  - Complete: tasks.md exists with all tasks marked complete
 */
function deriveStatus(featureDir: string): FeatureStatus {
  const specPath = join(featureDir, "spec.md");
  const planPath = join(featureDir, "plan.md");
  const tasksPath = join(featureDir, "tasks.md");

  if (!existsSync(specPath)) return "Draft";

  const specContent = readFileSync(specPath, "utf-8");
  if (specContent.includes("[NEEDS CLARIFICATION]")) return "Clarifying";

  if (existsSync(tasksPath)) {
    const tasksContent = readFileSync(tasksPath, "utf-8");
    // Check if there are any uncompleted task checkboxes
    const totalTasks = (tasksContent.match(/- \[[ x]\]/g) || []).length;
    const completedTasks = (tasksContent.match(/- \[x\]/gi) || []).length;

    if (totalTasks > 0 && completedTasks >= totalTasks) return "Complete";
    return "InProgress";
  }

  if (existsSync(planPath)) return "Planned";

  return "Draft";
}

/** Extract creation date from spec.md front-matter or file stat. */
function getCreatedAt(featureDir: string): string {
  const specPath = join(featureDir, "spec.md");
  if (existsSync(specPath)) {
    const content = readFileSync(specPath, "utf-8");
    // Look for Date or Created field in header
    const dateMatch = content.match(/\*\*Date\*\*:\s*(.+?)[\s|]/);
    if (dateMatch) return dateMatch[1].trim();

    const createdMatch = content.match(/Created:\s*(.+)/i);
    if (createdMatch) return createdMatch[1].trim();
  }
  // Fall back to file stat
  try {
    const stat = statSync(featureDir);
    return stat.birthtime.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

/** Find checklist files in the feature directory. */
function findChecklists(featureDir: string): string[] {
  const checklistDir = join(featureDir, "checklists");
  if (!existsSync(checklistDir)) return [];
  try {
    return readdirSync(checklistDir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => join(checklistDir, f));
  } catch {
    return [];
  }
}

/** Build a Feature object from a directory entry. */
function buildFeature(specsDir: string, dirName: string): Feature | null {
  const parsed = parseFeatureDir(dirName);
  if (!parsed) return null;

  const featureDir = join(specsDir, dirName);
  const specPath = join(featureDir, "spec.md");
  const planPath = join(featureDir, "plan.md");
  const tasksPath = join(featureDir, "tasks.md");

  if (!existsSync(specPath)) return null;

  return {
    number: parsed.number,
    shortName: parsed.shortName,
    slug: parsed.slug,
    branchName: parsed.slug,
    status: deriveStatus(featureDir),
    createdAt: getCreatedAt(featureDir),
    specPath,
    planPath: existsSync(planPath) ? planPath : null,
    tasksPath: existsSync(tasksPath) ? tasksPath : null,
    checklistPaths: findChecklists(featureDir),
  };
}

// ---------------------------------------------------------------------------
// Minimal spec parser (extracts title + description from spec.md)
// ---------------------------------------------------------------------------

function parseSpecMinimal(specPath: string): Specification {
  const content = readFileSync(specPath, "utf-8");

  // Extract title from first H1
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : "Untitled";

  // Extract description from header metadata
  const descMatch = content.match(/\*\*Description\*\*:\s*(.+)/i)
    ?? content.match(/\*\*Input\*\*:\s*(.+)/i);
  const description = descMatch ? descMatch[1].trim() : "";

  return {
    title,
    description,
    userStories: [],
    edgeCases: [],
    requirements: [],
    entities: [],
    successCriteria: [],
    clarifications: [],
    assumptions: [],
  };
}

// ---------------------------------------------------------------------------
// Sort comparators
// ---------------------------------------------------------------------------

type SortKey = "number" | "name" | "status" | "created";

const STATUS_ORDER: Record<FeatureStatus, number> = {
  Draft: 0,
  Clarifying: 1,
  Planned: 2,
  InProgress: 3,
  Complete: 4,
};

function sortFeatures(features: Feature[], sortBy: SortKey): Feature[] {
  const sorted = [...features];
  sorted.sort((a, b) => {
    switch (sortBy) {
      case "number":
        return a.number.localeCompare(b.number);
      case "name":
        return a.shortName.localeCompare(b.shortName);
      case "status":
        return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      case "created":
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      default:
        return 0;
    }
  });
  return sorted;
}

// ---------------------------------------------------------------------------
// GET /api/features
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const allProjects =
      request.nextUrl.searchParams.get("allProjects") === "true";

    let features: Feature[] = [];

    if (allProjects) {
      // Scan every registered project
      const projects = loadAllProjects();
      for (const project of projects) {
        const specsDir = join(project.path, "specs");
        const entries = readdirSync(specsDir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          const feature = buildFeature(specsDir, entry.name);
          if (feature) {
            feature.projectId = project.id;
            feature.projectName = project.name;
            features.push(feature);
          }
        }
      }
    } else {
      // Single-project mode (existing behaviour)
      const root = getProjectRoot(request);
      const specsDir = join(root, "specs");

      if (!existsSync(specsDir)) {
        return NextResponse.json([], { status: 200 });
      }

      const entries = readdirSync(specsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const feature = buildFeature(specsDir, entry.name);
        if (feature) features.push(feature);
      }
    }

    // Apply optional status filter
    const statusParam = request.nextUrl.searchParams.get("status");
    if (statusParam) {
      const validStatuses: FeatureStatus[] = [
        "Draft",
        "Clarifying",
        "Planned",
        "InProgress",
        "Complete",
      ];
      if (validStatuses.includes(statusParam as FeatureStatus)) {
        features = features.filter((f) => f.status === statusParam);
      }
    }

    // Apply sort
    const sortParam =
      (request.nextUrl.searchParams.get("sort") as SortKey) ?? "number";
    features = sortFeatures(features, sortParam);

    return NextResponse.json(features, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message, details: null } },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/features
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description, shortName } = body as {
      description: string;
      shortName?: string;
    };

    if (!description || typeof description !== "string") {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "description is required",
            details: null,
          },
        },
        { status: 400 },
      );
    }

    const root = getProjectRoot(request);
    const specsDir = join(root, "specs");

    // Determine next feature number
    let nextNumber = 1;
    if (existsSync(specsDir)) {
      const existing = readdirSync(specsDir, { withFileTypes: true });
      for (const entry of existing) {
        if (!entry.isDirectory()) continue;
        const match = entry.name.match(/^(\d{3})-/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num >= nextNumber) nextNumber = num + 1;
        }
      }
    }

    const paddedNumber = String(nextNumber).padStart(3, "0");
    const featureShortName =
      shortName ??
      description
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .slice(0, 50);
    const slug = `${paddedNumber}-${featureShortName}`;
    const featureDir = join(specsDir, slug);

    // Check for script-based creation
    const scriptPath = join(root, "create-new-feature.sh");
    if (existsSync(scriptPath)) {
      try {
        const args = shortName
          ? `"${description}" "${shortName}"`
          : `"${description}"`;
        execSync(`bash "${scriptPath}" ${args}`, {
          cwd: root,
          stdio: "pipe",
          timeout: 30_000,
        });
      } catch (scriptErr) {
        // Script failed — fall through to manual creation
        console.error("create-new-feature.sh failed, using manual creation:", scriptErr);
      }
    }

    // Manual creation fallback (or if no script exists)
    if (!existsSync(featureDir)) {
      const { mkdirSync, writeFileSync } = await import("node:fs");
      mkdirSync(featureDir, { recursive: true });
      mkdirSync(join(featureDir, "checklists"), { recursive: true });

      const specContent = `# ${description}

**Branch**: \`${slug}\` | **Date**: ${new Date().toISOString().split("T")[0]}

**Description**: ${description}

## User Stories

_No user stories defined yet._

## Requirements

_No requirements defined yet._

## Success Criteria

_No success criteria defined yet._
`;
      writeFileSync(join(featureDir, "spec.md"), specContent, "utf-8");
    }

    // Build response
    const feature = buildFeature(specsDir, slug);
    if (!feature) {
      return NextResponse.json(
        {
          error: {
            code: "CREATION_FAILED",
            message: "Feature directory was not created properly",
            details: null,
          },
        },
        { status: 500 },
      );
    }

    const spec = parseSpecMinimal(feature.specPath);

    return NextResponse.json({ feature, spec }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message, details: null } },
      { status: 500 },
    );
  }
}
