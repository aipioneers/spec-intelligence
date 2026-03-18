import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Plan, TechnicalContext } from "@spec-intelligence/ui";
import { getProjectRoot } from "../../../../../lib/project-root";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse plan.md into a Plan object. */
function parsePlanMarkdown(content: string): Plan {
  const plan: Plan = {
    summary: "",
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

  // Extract summary (text between first heading and next section)
  const summaryMatch = content.match(
    /^#\s+.+\n+([\s\S]*?)(?=\n## |\n---|\Z)/,
  );
  if (summaryMatch) {
    plan.summary = summaryMatch[1].trim();
  }

  // Extract technical context fields
  const techFields: Array<{
    key: keyof TechnicalContext;
    pattern: RegExp;
  }> = [
    { key: "language", pattern: /\*\*Language\*\*:\s*(.+)/i },
    { key: "storage", pattern: /\*\*Storage\*\*:\s*(.+)/i },
    { key: "testing", pattern: /\*\*Testing\*\*:\s*(.+)/i },
    { key: "targetPlatform", pattern: /\*\*Target Platform\*\*:\s*(.+)/i },
    { key: "projectType", pattern: /\*\*Project Type\*\*:\s*(.+)/i },
    { key: "performanceGoals", pattern: /\*\*Performance Goals?\*\*:\s*(.+)/i },
    { key: "constraints", pattern: /\*\*Constraints?\*\*:\s*(.+)/i },
    { key: "scaleScope", pattern: /\*\*Scale[\s/]?Scope\*\*:\s*(.+)/i },
  ];

  for (const { key, pattern } of techFields) {
    const match = content.match(pattern);
    if (match) {
      (plan.technicalContext as unknown as Record<string, unknown>)[key] = match[1].trim();
    }
  }

  // Parse dependencies (comma-separated or bullet list)
  const depsMatch = content.match(/\*\*Dependencies\*\*:\s*(.+)/i);
  if (depsMatch) {
    plan.technicalContext.dependencies = depsMatch[1]
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
  }

  // Extract project structure (code block or indented text under heading)
  const structMatch = content.match(
    /## Project Structure\s*\n+(?:```[\s\S]*?\n([\s\S]*?)```|(\s+[\s\S]*?))(?=\n## |\n---|\Z)/i,
  );
  if (structMatch) {
    plan.projectStructure = (structMatch[1] ?? structMatch[2] ?? "").trim();
  }

  // Extract constitution check
  const constMatch = content.match(/## Constitution Check\s*\n+([\s\S]*?)(?=\n## |\Z)/i);
  if (constMatch) {
    const section = constMatch[1];
    plan.constitutionCheck.passed = /pass/i.test(section) && !/fail/i.test(section);
    const details = section.match(/^[-*]\s+(.+)/gm);
    if (details) {
      plan.constitutionCheck.details = details.map((d) =>
        d.replace(/^[-*]\s+/, "").trim(),
      );
    }
  }

  return plan;
}

/** Convert a Plan object to markdown. */
function planToMarkdown(plan: Plan, slug: string): string {
  const lines: string[] = [];

  // Title
  const title = slug
    .replace(/^\d+-/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  lines.push(`# Implementation Plan: ${title}`);
  lines.push("");

  // Summary
  if (plan.summary) {
    lines.push(plan.summary);
    lines.push("");
  }

  // Technical Context
  lines.push("## Technical Context");
  lines.push("");
  const tc = plan.technicalContext;
  if (tc.language) lines.push(`**Language**: ${tc.language}`);
  if (tc.dependencies.length > 0) {
    lines.push(`**Dependencies**: ${tc.dependencies.join(", ")}`);
  }
  if (tc.storage) lines.push(`**Storage**: ${tc.storage}`);
  if (tc.testing) lines.push(`**Testing**: ${tc.testing}`);
  if (tc.targetPlatform) lines.push(`**Target Platform**: ${tc.targetPlatform}`);
  if (tc.projectType) lines.push(`**Project Type**: ${tc.projectType}`);
  if (tc.performanceGoals) lines.push(`**Performance Goals**: ${tc.performanceGoals}`);
  if (tc.constraints) lines.push(`**Constraints**: ${tc.constraints}`);
  if (tc.scaleScope) lines.push(`**Scale/Scope**: ${tc.scaleScope}`);
  lines.push("");

  // Project Structure
  if (plan.projectStructure) {
    lines.push("## Project Structure");
    lines.push("");
    lines.push("```");
    lines.push(plan.projectStructure);
    lines.push("```");
    lines.push("");
  }

  // Constitution Check
  lines.push("## Constitution Check");
  lines.push("");
  lines.push(`Status: ${plan.constitutionCheck.passed ? "PASS" : "FAIL"}`);
  lines.push("");
  if (plan.constitutionCheck.details.length > 0) {
    plan.constitutionCheck.details.forEach((d) => {
      lines.push(`- ${d}`);
    });
    lines.push("");
  }

  return lines.join("\n");
}

function createTemplatePlan(slug: string): Plan {
  const title = slug
    .replace(/^\d+-/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return {
    summary: `Implementation plan for ${title}. Connect Ollama to generate a detailed AI-powered plan.`,
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
    projectStructure: "src/\n  components/\n  lib/\n  types/",
    constitutionCheck: { passed: true, details: ["Template plan — start Ollama for AI generation"] },
  };
}

// ---------------------------------------------------------------------------
// GET /api/features/:slug/plan
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const { slug } = params;
    const root = getProjectRoot(_request);
    const planPath = join(root, "specs", slug, "plan.md");

    if (!existsSync(planPath)) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: `Plan not found for feature "${slug}"`,
            details: null,
          },
        },
        { status: 404 },
      );
    }

    const content = readFileSync(planPath, "utf-8");
    const plan = parsePlanMarkdown(content);

    return NextResponse.json(plan, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message, details: null } },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/features/:slug/plan  (Generate plan)
// ---------------------------------------------------------------------------

export async function POST(
  _request: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const { slug } = params;
    const root = getProjectRoot(_request);
    const featureDir = join(root, "specs", slug);
    const specPath = join(featureDir, "spec.md");
    const planPath = join(featureDir, "plan.md");

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

    // Check spec prerequisites
    if (existsSync(specPath)) {
      const specContent = readFileSync(specPath, "utf-8");
      if (specContent.includes("[NEEDS CLARIFICATION]")) {
        return NextResponse.json(
          {
            error: {
              code: "PREREQUISITE_FAILED",
              message:
                "Cannot generate plan: specification has unresolved [NEEDS CLARIFICATION] markers",
              details: null,
            },
          },
          { status: 422 },
        );
      }
    }

    // Try AI-powered generation via Ollama, fall back to template
    let markdown: string;
    try {
      const { generatePlanFromSpec, isOllamaAvailable } = await import("@/lib/llm");
      if (await isOllamaAvailable()) {
        const specContent = existsSync(specPath)
          ? readFileSync(specPath, "utf-8")
          : "";
        markdown = await generatePlanFromSpec(specContent, slug);
      } else {
        markdown = planToMarkdown(createTemplatePlan(slug), slug);
      }
    } catch {
      markdown = planToMarkdown(createTemplatePlan(slug), slug);
    }

    writeFileSync(planPath, markdown, "utf-8");
    const plan = parsePlanMarkdown(markdown);

    return NextResponse.json(plan, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message, details: null } },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PUT /api/features/:slug/plan  (Update plan)
// ---------------------------------------------------------------------------

export async function PUT(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const { slug } = params;
    const root = getProjectRoot(request);
    const featureDir = join(root, "specs", slug);
    const planPath = join(featureDir, "plan.md");

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

    const plan = (await request.json()) as Plan;
    const markdown = planToMarkdown(plan, slug);

    // Ensure directory exists
    mkdirSync(featureDir, { recursive: true });
    writeFileSync(planPath, markdown, "utf-8");

    return NextResponse.json(plan, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message, details: null } },
      { status: 500 },
    );
  }
}
