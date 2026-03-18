import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Feature, FeatureStatus, Specification } from "@spec-intelligence/ui";
import { getProjectRoot } from "../../../../lib/project-root";

// ---------------------------------------------------------------------------
// Helpers (shared with parent route — consider extracting to a shared module)
// ---------------------------------------------------------------------------

function deriveStatus(featureDir: string): FeatureStatus {
  const specPath = join(featureDir, "spec.md");
  const planPath = join(featureDir, "plan.md");
  const tasksPath = join(featureDir, "tasks.md");

  if (!existsSync(specPath)) return "Draft";

  const specContent = readFileSync(specPath, "utf-8");
  if (specContent.includes("[NEEDS CLARIFICATION]")) return "Clarifying";

  if (existsSync(tasksPath)) {
    const tasksContent = readFileSync(tasksPath, "utf-8");
    const totalTasks = (tasksContent.match(/- \[[ x]\]/g) || []).length;
    const completedTasks = (tasksContent.match(/- \[x\]/gi) || []).length;
    if (totalTasks > 0 && completedTasks >= totalTasks) return "Complete";
    return "InProgress";
  }

  if (existsSync(planPath)) return "Planned";
  return "Draft";
}

function getCreatedAt(featureDir: string): string {
  const specPath = join(featureDir, "spec.md");
  if (existsSync(specPath)) {
    const content = readFileSync(specPath, "utf-8");
    const dateMatch = content.match(/\*\*Date\*\*:\s*(.+?)[\s|]/);
    if (dateMatch) return dateMatch[1].trim();
  }
  try {
    return statSync(featureDir).birthtime.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

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

// ---------------------------------------------------------------------------
// GET /api/features/:slug
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const { slug } = params;
    const root = getProjectRoot(_request);
    const featureDir = join(root, "specs", slug);

    if (!existsSync(featureDir)) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: `Feature "${slug}" not found`, details: null } },
        { status: 404 },
      );
    }

    const specPath = join(featureDir, "spec.md");
    const planPath = join(featureDir, "plan.md");
    const tasksPath = join(featureDir, "tasks.md");

    const match = slug.match(/^(\d{3})-(.+)$/);
    if (!match) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Invalid feature slug format", details: null } },
        { status: 404 },
      );
    }

    const feature: Feature = {
      number: match[1],
      shortName: match[2],
      slug,
      branchName: slug,
      status: deriveStatus(featureDir),
      createdAt: getCreatedAt(featureDir),
      specPath,
      planPath: existsSync(planPath) ? planPath : null,
      tasksPath: existsSync(tasksPath) ? tasksPath : null,
      checklistPaths: findChecklists(featureDir),
    };

    // Parse spec
    let spec: Specification = {
      title: "Untitled",
      description: "",
      userStories: [],
      edgeCases: [],
      requirements: [],
      entities: [],
      successCriteria: [],
      clarifications: [],
      assumptions: [],
    };

    if (existsSync(specPath)) {
      const content = readFileSync(specPath, "utf-8");
      const titleMatch = content.match(/^#\s+(.+)$/m);
      spec.title = titleMatch ? titleMatch[1].trim() : "Untitled";
      const descMatch = content.match(/\*\*Description\*\*:\s*(.+)/i)
        ?? content.match(/\*\*Input\*\*:\s*(.+)/i);
      spec.description = descMatch ? descMatch[1].trim() : "";
    }

    // Parse plan (minimal)
    let plan = null;
    if (existsSync(planPath)) {
      const planContent = readFileSync(planPath, "utf-8");
      const summaryMatch = planContent.match(/^#\s+.+\n+(.+?)(?:\n\n|$)/s);
      plan = {
        summary: summaryMatch ? summaryMatch[1].trim() : "",
        technicalContext: {
          language: "",
          dependencies: [],
          storage: "",
          testing: "",
          targetPlatform: "",
          projectType: "",
          performanceGoals: "",
          constraints: "",
          scaleScope: "",
        },
        projectStructure: "",
        constitutionCheck: { passed: true, details: [] },
      };
    }

    // Parse tasks (minimal)
    let tasks = null;
    if (existsSync(tasksPath)) {
      tasks = [];
      const tasksContent = readFileSync(tasksPath, "utf-8");
      const taskLines = tasksContent.match(/- \[[ x]\]\s+\*\*([^*]+)\*\*.*?:\s*(.*)/gm);
      if (taskLines) {
        for (const line of taskLines) {
          const idMatch = line.match(/\*\*([^*]+)\*\*/);
          const descMatch = line.match(/:\s*(.*)/);
          const isDone = line.includes("[x]") || line.includes("[X]");
          tasks.push({
            id: idMatch ? idMatch[1].trim() : `T${tasks.length + 1}`,
            phase: "Foundation" as const,
            userStoryRef: null,
            description: descMatch ? descMatch[1].trim() : "",
            priority: "P1" as const,
            status: isDone ? ("Done" as const) : ("Todo" as const),
            isParallel: line.includes("[P]"),
            dependencies: [],
            filePaths: [],
          });
        }
      }
    }

    return NextResponse.json({ feature, spec, plan, tasks }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message, details: null } },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/features/:slug
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const { slug } = params;
    const root = getProjectRoot(_request);
    const featureDir = join(root, "specs", slug);

    if (!existsSync(featureDir)) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: `Feature "${slug}" not found`, details: null } },
        { status: 404 },
      );
    }

    rmSync(featureDir, { recursive: true, force: true });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message, details: null } },
      { status: 500 },
    );
  }
}
