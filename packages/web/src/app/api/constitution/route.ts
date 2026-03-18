import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { Constitution } from "@spec-intelligence/ui";
import { getProjectRoot } from "../../../lib/project-root";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse constitution.md into a structured Constitution object.
 * Uses a simplified parser that matches the markdown structure:
 *   ## Core Principles  -> ### Name / description / **Rationale**: ...
 *   ## Constraints       -> bullet list
 *   ## Development Guidelines -> bullet list
 *   **Version**: ...
 *   **Last Amended**: ...
 */
function parseConstitutionMarkdown(markdown: string): Constitution {
  const constitution: Constitution = {
    principles: [],
    constraints: [],
    developmentGuidelines: [],
    version: "",
    lastAmended: "",
  };

  // Extract version and last amended from header
  const versionMatch = markdown.match(/\*\*Version\*\*:\s*(.+)/);
  if (versionMatch) constitution.version = versionMatch[1].trim();

  const amendedMatch = markdown.match(/\*\*Last Amended\*\*:\s*(.+)/);
  if (amendedMatch) constitution.lastAmended = amendedMatch[1].trim();

  // Split by H2 sections
  const sections = markdown.split(/^## /m).slice(1);

  for (const section of sections) {
    const lines = section.split("\n");
    const heading = (lines[0] ?? "").trim().toLowerCase();
    const body = lines.slice(1).join("\n");

    if (heading.includes("principle") || heading.includes("core principles")) {
      // Parse H3 sub-sections as principles
      const principleBlocks = body.split(/^### /m).slice(1);
      for (const block of principleBlocks) {
        const blockLines = block.split("\n");
        const name = (blockLines[0] ?? "").trim();
        let description = "";
        let rationale = "";

        for (let i = 1; i < blockLines.length; i++) {
          const line = blockLines[i];
          const rationaleMatch = line.match(/\*\*Rationale\*\*:\s*(.+)/);
          if (rationaleMatch) {
            rationale = rationaleMatch[1].trim();
          } else if (line.trim() && !description) {
            description = line.trim();
          } else if (line.trim() && description && !rationale) {
            description += "\n" + line.trim();
          }
        }

        if (name) {
          constitution.principles.push({ name, description, rationale });
        }
      }
    } else if (heading.includes("constraint")) {
      constitution.constraints = extractBulletItems(body);
    } else if (
      heading.includes("development guideline") ||
      heading.includes("guidelines")
    ) {
      constitution.developmentGuidelines = extractBulletItems(body);
    }
  }

  return constitution;
}

function extractBulletItems(text: string): string[] {
  return text
    .split("\n")
    .filter((line) => line.trim().startsWith("- "))
    .map((line) => line.trim().replace(/^-\s+/, ""));
}

/**
 * Serialize a Constitution object back to markdown.
 */
function serializeConstitution(constitution: Constitution): string {
  const lines: string[] = [];

  lines.push("# Project Constitution");
  lines.push("");

  if (constitution.version) {
    lines.push(`**Version**: ${constitution.version}`);
  }
  if (constitution.lastAmended) {
    lines.push(`**Last Amended**: ${constitution.lastAmended}`);
  }
  if (constitution.version || constitution.lastAmended) {
    lines.push("");
  }

  // Principles
  if (constitution.principles.length > 0) {
    lines.push("## Core Principles");
    lines.push("");
    for (const principle of constitution.principles) {
      lines.push(`### ${principle.name}`);
      lines.push("");
      if (principle.description) {
        lines.push(principle.description);
        lines.push("");
      }
      if (principle.rationale) {
        lines.push(`**Rationale**: ${principle.rationale}`);
        lines.push("");
      }
    }
  }

  // Constraints
  if (constitution.constraints.length > 0) {
    lines.push("## Constraints");
    lines.push("");
    for (const constraint of constitution.constraints) {
      lines.push(`- ${constraint}`);
    }
    lines.push("");
  }

  // Development Guidelines
  if (constitution.developmentGuidelines.length > 0) {
    lines.push("## Development Guidelines");
    lines.push("");
    for (const guideline of constitution.developmentGuidelines) {
      lines.push(`- ${guideline}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// GET /api/constitution
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const root = getProjectRoot(request);
    const constitutionPath = join(root, "constitution.md");

    if (!existsSync(constitutionPath)) {
      return NextResponse.json(null, { status: 404 });
    }

    const markdown = readFileSync(constitutionPath, "utf-8");
    const constitution = parseConstitutionMarkdown(markdown);

    return NextResponse.json(constitution, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message, details: null } },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PUT /api/constitution
// ---------------------------------------------------------------------------

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as Constitution;

    if (!body || !Array.isArray(body.principles)) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid constitution data",
            details: null,
          },
        },
        { status: 400 },
      );
    }

    const root = getProjectRoot(request);
    const constitutionPath = join(root, "constitution.md");

    const markdown = serializeConstitution(body);
    writeFileSync(constitutionPath, markdown, "utf-8");

    // Re-parse to return normalized data
    const constitution = parseConstitutionMarkdown(markdown);

    return NextResponse.json({ constitution }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message, details: null } },
      { status: 500 },
    );
  }
}
