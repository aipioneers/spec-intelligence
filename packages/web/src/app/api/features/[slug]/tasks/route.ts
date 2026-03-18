import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Task, TaskStatus, TaskPhase, Priority } from "@spec-intelligence/ui";
import { getProjectRoot } from "../../../../../lib/project-root";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse tasks.md into a Task[] array. */
function parseTasksMarkdown(content: string): Task[] {
  const tasks: Task[] = [];

  // Match task lines: - [ ] **T001** (Phase: Setup, US: US1, P1, [P]): Description [depends: T002, T003] [files: src/foo.ts]
  const taskPattern =
    /- \[([x ])\]\s+\*\*([^*]+)\*\*\s*(?:\(([^)]*)\))?\s*:?\s*(.*)/gim;

  let match: RegExpExecArray | null;
  while ((match = taskPattern.exec(content)) !== null) {
    const isDone = match[1].toLowerCase() === "x";
    const id = match[2].trim();
    const meta = match[3] ?? "";
    const rest = match[4] ?? "";

    // Parse phase
    const phaseMatch = meta.match(/Phase:\s*(\w+)/i);
    const phase = (phaseMatch?.[1] ?? "Foundation") as TaskPhase;

    // Parse user story ref
    const usMatch = meta.match(/US:\s*(\w+)/i) ?? rest.match(/\[US:\s*(\w+)\]/i);
    const userStoryRef = usMatch ? usMatch[1] : null;

    // Parse priority
    const priorityMatch = meta.match(/\b(P[1-3])\b/i) ?? rest.match(/\b(P[1-3])\b/i);
    const priority = (priorityMatch?.[1]?.toUpperCase() ?? "P2") as Priority;

    // Parse parallel marker
    const isParallel = meta.includes("[P]") || rest.includes("[P]");

    // Parse dependencies
    const depsMatch = rest.match(/\[depends?:\s*([^\]]+)\]/i)
      ?? meta.match(/depends?:\s*([^\],)]+(?:,\s*[^\],)]+)*)/i);
    const dependencies = depsMatch
      ? depsMatch[1].split(",").map((d) => d.trim()).filter(Boolean)
      : [];

    // Parse file paths
    const filesMatch = rest.match(/\[files?:\s*([^\]]+)\]/i);
    const filePaths = filesMatch
      ? filesMatch[1].split(",").map((f) => f.trim()).filter(Boolean)
      : [];

    // Clean description (remove meta markers)
    let description = rest
      .replace(/\[depends?:\s*[^\]]+\]/gi, "")
      .replace(/\[files?:\s*[^\]]+\]/gi, "")
      .replace(/\[US:\s*\w+\]/gi, "")
      .replace(/\[P\]/gi, "")
      .replace(/\b(P[1-3])\b/gi, "")
      .trim();

    // Determine status
    let status: TaskStatus = isDone ? "Done" : "Todo";
    // Check for explicit status markers
    if (rest.includes("[InProgress]") || rest.includes("[in-progress]")) {
      status = "InProgress";
    } else if (rest.includes("[Blocked]") || rest.includes("[blocked]")) {
      status = "Blocked";
    }

    tasks.push({
      id,
      phase,
      userStoryRef,
      description: description || id,
      priority,
      status,
      isParallel,
      dependencies,
      filePaths,
    });
  }

  return tasks;
}

/** Convert Task[] to tasks.md markdown. */
function tasksToMarkdown(tasks: Task[], slug: string): string {
  const lines: string[] = [];

  const title = slug
    .replace(/^\d+-/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  lines.push(`# Tasks: ${title}`);
  lines.push("");

  // Group by phase
  const phases: TaskPhase[] = ["Setup", "Foundation", "UserStory", "Polish"];

  for (const phase of phases) {
    const phaseTasks = tasks.filter((t) => t.phase === phase);
    if (phaseTasks.length === 0) continue;

    lines.push(`## Phase: ${phase}`);
    lines.push("");

    for (const task of phaseTasks) {
      const checkbox = task.status === "Done" ? "[x]" : "[ ]";
      const metaParts: string[] = [];
      metaParts.push(`Phase: ${task.phase}`);
      if (task.userStoryRef) metaParts.push(`US: ${task.userStoryRef}`);
      metaParts.push(task.priority);
      if (task.isParallel) metaParts.push("[P]");

      let line = `- ${checkbox} **${task.id}** (${metaParts.join(", ")}): ${task.description}`;

      if (task.dependencies.length > 0) {
        line += ` [depends: ${task.dependencies.join(", ")}]`;
      }
      if (task.filePaths.length > 0) {
        line += ` [files: ${task.filePaths.join(", ")}]`;
      }
      if (task.status === "InProgress") {
        line += " [InProgress]";
      } else if (task.status === "Blocked") {
        line += " [Blocked]";
      }

      lines.push(line);
    }

    lines.push("");
  }

  return lines.join("\n");
}

function createTemplateTasks(slug: string): Task[] {
  const title = slug
    .replace(/^\d+-/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return [
    { id: "T001", phase: "Setup", userStoryRef: null, description: `Initialize project structure for ${title}`, priority: "P1", status: "Todo", isParallel: false, dependencies: [], filePaths: [] },
    { id: "T002", phase: "Setup", userStoryRef: null, description: "Set up dependencies and tooling", priority: "P1", status: "Todo", isParallel: true, dependencies: ["T001"], filePaths: ["package.json"] },
    { id: "T003", phase: "Foundation", userStoryRef: null, description: "Create core types and interfaces", priority: "P1", status: "Todo", isParallel: false, dependencies: ["T001"], filePaths: ["src/types/index.ts"] },
    { id: "T004", phase: "Foundation", userStoryRef: null, description: "Implement base components", priority: "P2", status: "Todo", isParallel: true, dependencies: ["T003"], filePaths: ["src/components/"] },
    { id: "T005", phase: "Polish", userStoryRef: null, description: "Add tests and documentation", priority: "P3", status: "Todo", isParallel: true, dependencies: ["T004"], filePaths: ["tests/"] },
  ];
}

// ---------------------------------------------------------------------------
// GET /api/features/:slug/tasks
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const { slug } = params;
    const root = getProjectRoot(_request);
    const tasksPath = join(root, "specs", slug, "tasks.md");

    if (!existsSync(tasksPath)) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: `Tasks not found for feature "${slug}"`,
            details: null,
          },
        },
        { status: 404 },
      );
    }

    const content = readFileSync(tasksPath, "utf-8");
    const tasks = parseTasksMarkdown(content);

    return NextResponse.json(tasks, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message, details: null } },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/features/:slug/tasks  (Generate tasks)
// ---------------------------------------------------------------------------

export async function POST(
  _request: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const { slug } = params;
    const root = getProjectRoot(_request);
    const featureDir = join(root, "specs", slug);
    const planPath = join(featureDir, "plan.md");
    const tasksPath = join(featureDir, "tasks.md");

    if (!existsSync(featureDir)) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: `Feature "${slug}" not found`,
            details: null,
          },
        },
        { status: 404 },
      );
    }

    // Try AI-powered generation via Ollama, fall back to template
    let markdown: string;
    try {
      const { generateTasksFromPlan, isOllamaAvailable } = await import("@/lib/llm");
      if (await isOllamaAvailable()) {
        const specContent = existsSync(join(featureDir, "spec.md"))
          ? readFileSync(join(featureDir, "spec.md"), "utf-8")
          : "";
        const planContent = existsSync(planPath)
          ? readFileSync(planPath, "utf-8")
          : "";
        markdown = await generateTasksFromPlan(specContent, planContent, slug);
      } else {
        markdown = tasksToMarkdown(createTemplateTasks(slug), slug);
      }
    } catch {
      markdown = tasksToMarkdown(createTemplateTasks(slug), slug);
    }

    mkdirSync(featureDir, { recursive: true });
    writeFileSync(tasksPath, markdown, "utf-8");

    const tasks = parseTasksMarkdown(markdown);
    return NextResponse.json(tasks, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message, details: null } },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/features/:slug/tasks  (Update task status)
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const { slug } = params;
    const root = getProjectRoot(request);
    const tasksPath = join(root, "specs", slug, "tasks.md");

    if (!existsSync(tasksPath)) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: `Tasks not found for feature "${slug}"`,
            details: null,
          },
        },
        { status: 404 },
      );
    }

    const body = (await request.json()) as {
      taskId: string;
      status: TaskStatus;
    };

    if (!body.taskId || !body.status) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "taskId and status are required",
            details: null,
          },
        },
        { status: 400 },
      );
    }

    const content = readFileSync(tasksPath, "utf-8");
    const tasks = parseTasksMarkdown(content);

    const taskIndex = tasks.findIndex((t) => t.id === body.taskId);
    if (taskIndex === -1) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: `Task "${body.taskId}" not found`,
            details: null,
          },
        },
        { status: 404 },
      );
    }

    // Update the task status
    const updatedTask = { ...tasks[taskIndex], status: body.status };
    tasks[taskIndex] = updatedTask;

    // Find affected tasks (tasks that depend on the updated task)
    const affectedTasks: Task[] = [];
    if (body.status === "Done") {
      // When a task is completed, check if blocked tasks can be unblocked
      for (const task of tasks) {
        if (task.id === body.taskId) continue;
        if (!task.dependencies.includes(body.taskId)) continue;

        const allDepsComplete = task.dependencies.every((depId) => {
          const dep = tasks.find((t) => t.id === depId);
          return dep && dep.status === "Done";
        });

        if (allDepsComplete && task.status === "Blocked") {
          task.status = "Todo";
          affectedTasks.push(task);
        }
      }
    } else {
      // When a task is un-completed, check if dependent tasks should be blocked
      for (const task of tasks) {
        if (task.id === body.taskId) continue;
        if (!task.dependencies.includes(body.taskId)) continue;

        if (task.status !== "Done") {
          task.status = "Blocked";
          affectedTasks.push(task);
        }
      }
    }

    // Write updated tasks back to file
    const updatedMarkdown = tasksToMarkdown(tasks, slug);
    writeFileSync(tasksPath, updatedMarkdown, "utf-8");

    return NextResponse.json(
      { task: updatedTask, affectedTasks },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message, details: null } },
      { status: 500 },
    );
  }
}
